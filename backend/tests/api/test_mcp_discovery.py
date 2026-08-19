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


# ---------------------------------------------------------------------------
# Transport-level connector requirements
#
# Each of these was a real 4xx that a remote MCP client hits before it can
# reach any tool.
# ---------------------------------------------------------------------------


def test_protected_resource_metadata_at_rfc9728_path():
    """
    RFC 9728 3.1 appends the resource path to the well-known prefix, so a
    resource at /mcp publishes at /.well-known/oauth-protected-resource/mcp.
    Clients probe that form first; it used to 404.
    """
    with TestClient(app) as client:
        suffixed = client.get("/.well-known/oauth-protected-resource/mcp")
        assert suffixed.status_code == 200

        bare = client.get("/.well-known/oauth-protected-resource")
        assert bare.status_code == 200

        # Both locations must describe the same resource.
        assert suffixed.json() == bare.json()
        assert suffixed.json()["resource"] == settings.mcp_endpoint_url


def test_cors_preflight_allowed_from_claude_origin():
    """
    https://claude.ai is listed in MCP_ALLOWED_ORIGINS, but CORSMiddleware used
    to trust only the admin frontend, so a preflight from Claude was answered
    "400 Disallowed CORS origin".
    """
    with TestClient(app, base_url="https://testserver") as client:
        response = client.options(
            "/mcp",
            headers={
                "Origin": "https://claude.ai",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://claude.ai"


def test_bare_options_on_mcp_is_not_a_405():
    """
    A non-preflight OPTIONS used to fall through to the MCP transport, which
    does not implement it, producing a JSON-RPC "Method Not Allowed" body.
    """
    with TestClient(app, base_url="https://testserver") as client:
        response = client.options("/mcp")

    assert response.status_code == 204
    assert "Method Not Allowed" not in response.text

    allowed = {m.strip() for m in response.headers["allow"].split(",")}
    # DELETE terminates a session in the Streamable HTTP transport and must be
    # advertised and routable, not just tolerated.
    assert {"GET", "POST", "DELETE", "OPTIONS"} == allowed


def test_delete_on_mcp_is_routed_not_405():
    """
    DELETE was missing from the route's method list, so once a request got past
    auth it would have been rejected by routing. Unauthenticated it must stop at
    the auth middleware (401) rather than at routing (405).
    """
    with TestClient(app, base_url="https://testserver") as client:
        response = client.delete("/mcp")

    assert response.status_code == 401
