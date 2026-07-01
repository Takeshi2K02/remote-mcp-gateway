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
    # Patch SessionLocal to use SQLite in-memory database during tests
    original_db_session_local = app.db.database.SessionLocal
    original_auth_session_local = app.auth.middleware.SessionLocal
    
    app.db.database.SessionLocal = TestingSessionLocal
    app.auth.middleware.SessionLocal = TestingSessionLocal

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        user = User(
            id=1,
            entra_object_id="test-entra-user-id",
            email="test-user@example.com",
            full_name="Test User",
            is_active=True,
        )
        db.add(user)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        app.db.database.SessionLocal = original_db_session_local
        app.auth.middleware.SessionLocal = original_auth_session_local


@pytest.fixture(name="auth_headers")
def fixture_auth_headers():
    token = create_access_token(
        subject="test-entra-user-id",
        claims={
            "email": "test-user@example.com",
            "full_name": "Test User",
            "scope": "mcp",
        },
    )
    return {
        "host": "localhost:8000",
        "accept": "application/json, text/event-stream",
        "content-type": "application/json",
        "Authorization": f"Bearer {token}",
    }


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


def test_mcp_streamable_http_initialization(client, auth_headers):
    """Test that client can initiate connection and initialize session over Streamable HTTP."""
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
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    assert "text/event-stream" in response.headers["content-type"]
    assert "mcp-session-id" in response.headers

    # SSE content check
    content = response.text
    assert "data" in content or "event" in content


def test_mcp_streamable_http_invalid_request(client, auth_headers):
    """Test that sending an invalid payload yields a proper JSON-RPC error."""
    response = client.post(
        "/mcp/",
        json={"invalid": "payload"},
        headers=auth_headers,
    )

    assert response.status_code == 400, response.text
    assert "application/json" in response.headers["content-type"]

    data = response.json()
    assert data["jsonrpc"] == "2.0"
    assert "error" in data
    assert data["error"]["code"] == -32602  # Invalid Params


def test_mcp_streamable_http_initialization_no_trailing_slash(client, auth_headers):
    """Test that client can initiate connection and initialize session over Streamable HTTP without a trailing slash."""
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
        "/mcp",
        json=payload,
        headers=auth_headers,
        follow_redirects=False,
    )

    assert response.status_code == 200, response.text
    assert "text/event-stream" in response.headers["content-type"]
    assert "mcp-session-id" in response.headers

    # SSE content check
    content = response.text
    assert "data" in content or "event" in content


def test_mcp_transport_allowed_azure_host(client, auth_headers):
    """Test that the configured Azure host is accepted."""
    headers = auth_headers.copy()
    headers["host"] = "backend-gateway.gentleforest-38e3a42b.southeastasia.azurecontainerapps.io"
    
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
        "/mcp",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 200, response.text
    assert "mcp-session-id" in response.headers


def test_mcp_transport_unauthorized_host(client, auth_headers):
    """Test that an unauthorized host is rejected with 421."""
    headers = auth_headers.copy()
    headers["host"] = "attacker.com"
    
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
        "/mcp",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 421
    assert "Invalid Host header" in response.text
