from datetime import datetime, timedelta, UTC
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.database
import app.auth.middleware
from app.auth.jwt_service import create_access_token
from app.core.config import get_settings
from app.db.database import Base, get_db
from app.main import app as fastapi_app
from app.models.oauth_authorization_code import OAuthAuthorizationCode
from app.models.oauth_client import OAuthClient
from app.models.user import User
from fastapi import Request
from app.services.oauth_client_service import OAuthClientService

@fastapi_app.get("/auth/test-set-session")
def set_session_helper(request: Request, entra_object_id: str = "test-entra-user-id"):
    request.session["entra_object_id"] = entra_object_id
    return {"status": "session_set"}

@fastapi_app.get("/auth/test-set-pending")
def set_pending_helper(request: Request):
    request.session["pending_oauth_request"] = {
        "client_id": "client_public_id",
        "redirect_uri": "http://localhost/callback",
        "response_type": "code",
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "code_challenge_method": "S256",
        "scope": "mcp",
        "state": "xyz",
    }
    return {"status": "pending_set"}

@fastapi_app.get("/auth/test-get-session")
def get_session_helper(request: Request):
    return dict(request.session)

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def fixture_db_session():
    # Patch SessionLocal to use SQLite in-memory database during tests
    original_db_session_local = app.db.database.SessionLocal
    original_auth_session_local = app.auth.middleware.SessionLocal
    
    app.db.database.SessionLocal = TestingSessionLocal
    app.auth.middleware.SessionLocal = TestingSessionLocal

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Create active test user
        user = User(
            id=1,
            entra_object_id="test-entra-user-id",
            email="test-user@example.com",
            full_name="Test User",
            is_active=True,
        )
        # Create inactive test user
        inactive_user = User(
            id=2,
            entra_object_id="inactive-entra-user-id",
            email="inactive-user@example.com",
            full_name="Inactive User",
            is_active=False,
        )
        db.add(user)
        db.add(inactive_user)

        # Create public client
        public_client = OAuthClient(
            id=1,
            client_id="client_public_id",
            client_name="Public Client",
            client_type="public",
            redirect_uris=["http://localhost/callback"],
            allowed_scopes=["mcp"],
            is_active=True,
        )

        # Create confidential client
        confidential_client = OAuthClient(
            id=2,
            client_id="client_confidential_id",
            client_name="Confidential Client",
            client_type="confidential",
            client_secret_hash=OAuthClientService.hash_secret("super_secret"),
            redirect_uris=["http://localhost/callback"],
            allowed_scopes=["mcp"],
            is_active=True,
        )

        db.add(public_client)
        db.add(confidential_client)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        app.db.database.SessionLocal = original_db_session_local
        app.auth.middleware.SessionLocal = original_auth_session_local


@pytest.fixture(name="client")
def fixture_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


def test_successful_authorization_flow_public(client, db_session):
    # Log in user by setting the session
    client.get("/auth/test-set-session", params={"entra_object_id": "test-entra-user-id"})

    auth_params = {
        "client_id": "client_public_id",
        "redirect_uri": "http://localhost/callback",
        "response_type": "code",
        # SHA256 challenge of "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "code_challenge_method": "S256",
        "scope": "mcp",
        "state": "random_state",
    }

    response = client.get(
        "/oauth/authorize", params=auth_params, follow_redirects=False
    )
    assert response.status_code == 307, response.text
    redirect_url = response.headers["location"]
    assert "code=" in redirect_url
    assert "state=random_state" in redirect_url

    # Extract code
    code = redirect_url.split("code=")[1].split("&")[0]

    # 2. Exchange Token POST request
    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "http://localhost/callback",
        "client_id": "client_public_id",
        "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    }

    response = client.post("/oauth/token", data=token_payload)
    assert response.status_code == 200, response.json()
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "Bearer"
    assert "expires_in" in token_data

    # Decode and check claims of issued access token
    from jose import jwt

    settings = get_settings()
    claims = jwt.decode(
        token_data["access_token"],
        settings.app_jwt_secret_key,
        algorithms=[settings.app_jwt_algorithm],
    )
    assert claims["sub"] == "test-entra-user-id"
    assert claims["email"] == "test-user@example.com"
    assert claims["full_name"] == "Test User"
    assert claims["scope"] == "mcp"


def test_successful_authorization_flow_confidential(client, db_session):
    # Log in user by setting the session
    client.get("/auth/test-set-session", params={"entra_object_id": "test-entra-user-id"})

    auth_params = {
        "client_id": "client_confidential_id",
        "redirect_uri": "http://localhost/callback",
        "response_type": "code",
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "code_challenge_method": "S256",
        "scope": "mcp",
        "state": "xyz",
    }

    response = client.get(
        "/oauth/authorize", params=auth_params, follow_redirects=False
    )
    assert response.status_code == 307, response.text
    code = response.headers["location"].split("code=")[1].split("&")[0]

    # 2. Exchange Token POST request with basic auth header
    import base64

    basic_auth = base64.b64encode(
        b"client_confidential_id:super_secret"
    ).decode("ascii")

    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "http://localhost/callback",
        "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    }

    response = client.post(
        "/oauth/token",
        data=token_payload,
        headers={"Authorization": f"Basic {basic_auth}"},
    )
    assert response.status_code == 200, response.json()
    assert "access_token" in response.json()


def test_invalid_client(client, db_session):
    auth_params = {
        "client_id": "nonexistent_client_id",
        "redirect_uri": "http://localhost/callback",
        "response_type": "code",
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "code_challenge_method": "S256",
    }

    response = client.get("/oauth/authorize", params=auth_params)
    assert response.status_code == 400
    assert "Invalid client_id" in response.json()["detail"]


def test_invalid_redirect_uri(client, db_session):
    auth_params = {
        "client_id": "client_public_id",
        "redirect_uri": "http://invalid-redirect.com",
        "response_type": "code",
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "code_challenge_method": "S256",
    }

    response = client.get("/oauth/authorize", params=auth_params)
    assert response.status_code == 400
    assert "Invalid redirect_uri" in response.json()["detail"]


def test_invalid_pkce_verifier(client, db_session):
    # Log in user by setting the session
    client.get("/auth/test-set-session", params={"entra_object_id": "test-entra-user-id"})

    auth_params = {
        "client_id": "client_public_id",
        "redirect_uri": "http://localhost/callback",
        "response_type": "code",
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "code_challenge_method": "S256",
    }

    response = client.get(
        "/oauth/authorize", params=auth_params, follow_redirects=False
    )
    code = response.headers["location"].split("code=")[1].split("&")[0]

    # Exchange Token with invalid verifier
    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "http://localhost/callback",
        "client_id": "client_public_id",
        "code_verifier": "wrong_verifier_here_too_short",
    }

    response = client.post("/oauth/token", data=token_payload)
    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "invalid_grant"
    assert "PKCE verification failed" in response.json()["detail"]["error_description"]


def test_expired_code(client, db_session):
    # Generate an expired code manually in database
    db_code = OAuthAuthorizationCode(
        code="expired_test_code",
        client_id="client_public_id",
        user_id=1,
        redirect_uri="http://localhost/callback",
        code_challenge="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        code_challenge_method="S256",
        scopes=["mcp"],
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
        created_at=datetime.now(UTC) - timedelta(minutes=10),
    )
    db_code.expires_at = datetime.now(UTC) - timedelta(minutes=1)  # explicit naive datetime for sqlite check just in case
    db_session.add(db_code)
    db_session.commit()

    token_payload = {
        "grant_type": "authorization_code",
        "code": "expired_test_code",
        "redirect_uri": "http://localhost/callback",
        "client_id": "client_public_id",
        "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    }

    response = client.post("/oauth/token", data=token_payload)
    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "invalid_grant"
    assert "expired" in response.json()["detail"]["error_description"]


def test_reused_authorization_code(client, db_session):
    # Generate an already consumed code manually in database
    db_code = OAuthAuthorizationCode(
        code="consumed_test_code",
        client_id="client_public_id",
        user_id=1,
        redirect_uri="http://localhost/callback",
        code_challenge="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        code_challenge_method="S256",
        scopes=["mcp"],
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
        consumed_at=datetime.now(UTC) - timedelta(seconds=10),
    )
    db_session.add(db_code)
    db_session.commit()

    token_payload = {
        "grant_type": "authorization_code",
        "code": "consumed_test_code",
        "redirect_uri": "http://localhost/callback",
        "client_id": "client_public_id",
        "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    }

    response = client.post("/oauth/token", data=token_payload)
    assert response.status_code == 400
    assert response.json()["detail"]["error"] == "invalid_grant"
    assert "consumed" in response.json()["detail"]["error_description"]


def test_unauthenticated_authorize_redirects_to_login(client):
    auth_params = {
        "client_id": "client_public_id",
        "redirect_uri": "http://localhost/callback",
        "response_type": "code",
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "code_challenge_method": "S256",
        "scope": "mcp",
        "state": "xyz",
    }
    response = client.get("/oauth/authorize", params=auth_params, follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/auth/login"

    session_response = client.get("/auth/test-get-session")
    assert session_response.status_code == 200
    session_data = session_response.json()
    assert "pending_oauth_request" in session_data
    pending = session_data["pending_oauth_request"]
    assert pending["client_id"] == "client_public_id"
    assert pending["redirect_uri"] == "http://localhost/callback"
    assert pending["response_type"] == "code"
    assert pending["code_challenge"] == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    assert pending["code_challenge_method"] == "S256"
    assert pending["scope"] == "mcp"
    assert pending["state"] == "xyz"


def test_authenticated_session_issues_code(client, db_session):
    client.get("/auth/test-set-session", params={"entra_object_id": "test-entra-user-id"})

    auth_params = {
        "client_id": "client_public_id",
        "redirect_uri": "http://localhost/callback",
        "response_type": "code",
        "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        "code_challenge_method": "S256",
        "scope": "mcp",
        "state": "xyz",
    }
    response = client.get("/oauth/authorize", params=auth_params, follow_redirects=False)
    assert response.status_code == 307
    redirect_url = response.headers["location"]
    assert "code=" in redirect_url
    assert "state=xyz" in redirect_url


@pytest.mark.anyio
async def test_auth_callback_redirects_to_authorize_with_pending_request(client, db_session):
    from unittest.mock import AsyncMock, patch

    client.get("/auth/test-set-pending")

    mock_token = {
        "userinfo": {
            "oid": "test-entra-user-id",
            "email": "test-user@example.com",
            "name": "Test User",
        }
    }
    with patch("app.api.auth.oauth.microsoft.authorize_access_token", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value = mock_token

        response = client.get("/auth/callback", follow_redirects=False)
        assert response.status_code == 307
        redirect_url = response.headers["location"]
        assert redirect_url.startswith("/oauth/authorize?")
        assert "client_id=client_public_id" in redirect_url
        assert "state=xyz" in redirect_url


@pytest.mark.anyio
async def test_auth_callback_creates_new_user(client, db_session):
    from unittest.mock import AsyncMock, patch

    mock_token = {
        "userinfo": {
            "oid": "new-entra-user-id",
            "email": "new-user@example.com",
            "name": "New User",
        }
    }
    with patch("app.api.auth.oauth.microsoft.authorize_access_token", new_callable=AsyncMock) as mock_auth:
        mock_auth.return_value = mock_token

        response = client.get("/auth/callback", follow_redirects=False)
        assert response.status_code == 307

        # Verify new user is created in database
        user = db_session.query(User).filter(User.entra_object_id == "new-entra-user-id").first()
        assert user is not None
        assert user.email == "new-user@example.com"
        assert user.full_name == "New User"
        assert user.is_active is True
