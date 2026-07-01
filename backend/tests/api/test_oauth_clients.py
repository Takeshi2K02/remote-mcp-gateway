import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.oauth_client import OAuthClient
from app.services.oauth_client_service import OAuthClientService
from app.schemas.oauth_client import OAuthClientCreate, OAuthClientUpdate

# Setup SQLite in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def fixture_db_session():
    # Create all tables in the SQLite database
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Create a mock user in the database
        user = User(
            id=1,
            entra_object_id="test-entra-user-id",
            email="test-admin@example.com",
            full_name="Test User",
            is_active=True
        )
        db.add(user)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="client")
def fixture_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        user = db_session.query(User).filter(User.id == 1).first()
        return user

    # Override dependencies
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    # Clean up overrides
    app.dependency_overrides.clear()


def test_create_confidential_client(client, db_session):
    """Test creating a confidential OAuth client generates client ID and secret."""
    payload = {
        "client_name": "Claude Desktop Integration",
        "client_type": "confidential",
        "redirect_uris": ["http://localhost:8000/callback"],
        "allowed_scopes": ["mcp"],
    }
    response = client.post("/oauth-clients/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["client_name"] == payload["client_name"]
    assert data["client_type"] == "confidential"
    assert data["client_id"].startswith("client_")
    assert "client_secret" in data
    assert data["client_secret"] is not None

    # Check database record
    db_client = db_session.query(OAuthClient).filter(OAuthClient.client_id == data["client_id"]).first()
    assert db_client is not None
    assert db_client.client_secret_hash == OAuthClientService.hash_secret(data["client_secret"])
    assert db_client.redirect_uris == payload["redirect_uris"]
    assert db_client.allowed_scopes == payload["allowed_scopes"]


def test_create_public_client(client, db_session):
    """Test creating a public OAuth client does not generate client secret."""
    payload = {
        "client_name": "Cursor App Client",
        "client_type": "public",
        "redirect_uris": ["http://localhost:8080/callback"],
        "allowed_scopes": ["mcp"],
    }
    response = client.post("/oauth-clients/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["client_name"] == payload["client_name"]
    assert data["client_type"] == "public"
    assert data["client_id"].startswith("client_")
    assert data["client_secret"] is None

    # Check database record
    db_client = db_session.query(OAuthClient).filter(OAuthClient.client_id == data["client_id"]).first()
    assert db_client is not None
    assert db_client.client_secret_hash is None


def test_get_oauth_client(client, db_session):
    """Test retrieving an OAuth client does not leak client secret hashes."""
    service = OAuthClientService(db_session)
    create_schema = OAuthClientCreate(
        client_name="Test Confidential Client",
        client_type="confidential",
        redirect_uris=["https://example.com/callback"],
        allowed_scopes=["mcp"],
    )
    db_client, _ = service.create_client(create_schema)

    response = client.get(f"/oauth-clients/{db_client.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["client_name"] == create_schema.client_name
    assert data["client_id"] == db_client.client_id
    assert "client_secret" not in data
    assert "client_secret_hash" not in data


def test_list_oauth_clients(client, db_session):
    """Test listing OAuth clients."""
    service = OAuthClientService(db_session)
    service.create_client(
        OAuthClientCreate(
            client_name="Client A",
            client_type="public",
            redirect_uris=["http://localhost/cb"],
        )
    )
    service.create_client(
        OAuthClientCreate(
            client_name="Client B",
            client_type="confidential",
            redirect_uris=["http://localhost/cb"],
        )
    )

    response = client.get("/oauth-clients/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [c["client_name"] for c in data]
    assert "Client A" in names
    assert "Client B" in names


def test_update_oauth_client(client, db_session):
    """Test updating an OAuth client."""
    service = OAuthClientService(db_session)
    db_client, _ = service.create_client(
        OAuthClientCreate(
            client_name="Old Client Name",
            client_type="public",
            redirect_uris=["http://localhost/cb"],
        )
    )

    payload = {
        "client_name": "New Client Name",
        "redirect_uris": ["http://localhost:8080/cb"],
    }
    response = client.patch(f"/oauth-clients/{db_client.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["client_name"] == payload["client_name"]
    assert data["redirect_uris"] == payload["redirect_uris"]

    # Verify db update
    db_session.refresh(db_client)
    assert db_client.client_name == payload["client_name"]
    assert db_client.redirect_uris == payload["redirect_uris"]


def test_delete_oauth_client(client, db_session):
    """Test deleting an OAuth client."""
    service = OAuthClientService(db_session)
    db_client, _ = service.create_client(
        OAuthClientCreate(
            client_name="Delete Me Client",
            client_type="public",
            redirect_uris=["http://localhost/cb"],
        )
    )

    response = client.delete(f"/oauth-clients/{db_client.id}")
    assert response.status_code == 204

    # Verify client is removed from database
    assert db_session.query(OAuthClient).filter(OAuthClient.id == db_client.id).first() is None


def test_invalid_redirect_uris(client):
    """Test validation blocks invalid redirect URIs."""
    payload = {
        "client_name": "Invalid Client",
        "client_type": "public",
        "redirect_uris": ["invalid-uri-no-scheme"],
    }
    response = client.post("/oauth-clients/", json=payload)
    assert response.status_code == 400
    assert "Scheme is missing" in response.json()["detail"]
