import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings

settings = get_settings()


def test_oauth_protected_resource_endpoint():
    """Test that the OAuth Protected Resource Metadata endpoint returns correct fields."""
    with TestClient(app) as client:
        response = client.get("/.well-known/oauth-protected-resource")
        assert response.status_code == 200
        data = response.json()
        assert data["resource"] == settings.mcp_endpoint_url
        assert data["authorization_servers"] == [settings.backend_base_url]
        assert "scopes_supported" in data
        assert "bearer_methods_supported" in data


def test_oauth_authorization_server_endpoint():
    """Test that the OAuth Authorization Server Metadata endpoint returns correct fields."""
    with TestClient(app) as client:
        response = client.get("/.well-known/oauth-authorization-server")
        assert response.status_code == 200
        data = response.json()
        assert data["issuer"] == settings.backend_base_url
        assert data["authorization_endpoint"] == f"{settings.backend_base_url}/oauth/authorize"
        assert data["token_endpoint"] == f"{settings.backend_base_url}/oauth/token"
        assert "response_types_supported" in data
        assert "grant_types_supported" in data


def test_mcp_server_endpoint():
    """Test that the MCP server manifest endpoint returns correct format and transport info."""
    with TestClient(app) as client:
        response = client.get("/.well-known/mcp-server")
        assert response.status_code == 200
        data = response.json()
        assert data["mcp_version"] == "2024-11-05"
        assert data["name"] == settings.app_name
        assert data["endpoint"] == settings.mcp_endpoint_url
        assert data["transport"] == "streamable_http"
        assert data["transports"] == ["streamable_http"]
        assert data["trust_class"] == "public"
        assert data["auth"]["required"] is True
        assert data["auth"]["methods"] == ["oauth2"]
        assert data["auth"]["authorization_endpoint"] == f"{settings.backend_base_url}/oauth/authorize"
        assert data["auth"]["token_endpoint"] == f"{settings.backend_base_url}/oauth/token"
        assert data["auth"]["scopes"] == ["mcp"]
