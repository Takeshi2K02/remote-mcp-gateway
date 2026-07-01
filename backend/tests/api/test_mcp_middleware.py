import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.database
import app.auth.middleware
from app.auth.jwt_service import create_access_token
from app.db.database import Base, get_db
from app.main import app as fastapi_app
from app.models.user import User

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def fixture_db_session():
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


def test_middleware_only_protects_mcp_routes(client):
    # Non-mcp route /health should not require authentication
    response = client.get("/health")
    assert response.status_code == 200


def test_middleware_rejects_missing_bearer_token(client):
    # Call /mcp/ with no headers
    response = client.post("/mcp/")
    assert response.status_code == 401
    assert "Missing or invalid Bearer Token" in response.json()["detail"]


def test_middleware_rejects_invalid_bearer_token(client):
    # Call /mcp/ with malformed token
    response = client.post("/mcp/", headers={"Authorization": "Bearer invalid.token.payload"})
    assert response.status_code == 401
    assert "Invalid application token" in response.json()["detail"]


def test_middleware_rejects_token_without_mcp_scope(client):
    # Generate token with wrong scope
    token = create_access_token(
        subject="test-entra-user-id",
        claims={
            "email": "test-user@example.com",
            "full_name": "Test User",
            "scope": "wrong_scope",
        },
    )
    response = client.post("/mcp/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert "Token lacks 'mcp' scope" in response.json()["detail"]


def test_middleware_rejects_inactive_user(client):
    # Generate token for inactive user (user 2)
    token = create_access_token(
        subject="inactive-entra-user-id",
        claims={
            "email": "inactive-user@example.com",
            "full_name": "Inactive User",
            "scope": "mcp",
        },
    )
    response = client.post("/mcp/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert "User account is inactive" in response.json()["detail"]


def test_middleware_allows_valid_token(client):
    # Generate token for active user
    token = create_access_token(
        subject="test-entra-user-id",
        claims={
            "email": "test-user@example.com",
            "full_name": "Test User",
            "scope": "mcp",
        },
    )
    
    # Initialize request payload
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test-client", "version": "1.0.0"},
        },
    }

    response = client.post(
        "/mcp/",
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "host": "localhost:8000",
            "accept": "application/json, text/event-stream",
            "content-type": "application/json",
        },
    )
    
    # Initialize request should succeed and return text/event-stream
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
