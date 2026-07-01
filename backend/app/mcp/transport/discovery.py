from fastapi import APIRouter
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/.well-known/oauth-protected-resource")
def get_oauth_protected_resource_metadata():
    """Exposes RFC 9728 OAuth Protected Resource Metadata."""
    return {
        "resource": settings.mcp_endpoint_url,
        "authorization_servers": [settings.backend_base_url],
        "scopes_supported": ["mcp"],
        "bearer_methods_supported": ["header"],
    }


@router.get("/.well-known/oauth-authorization-server")
def get_oauth_authorization_server_metadata():
    """Exposes RFC 8414 OAuth 2.0 Authorization Server Metadata."""
    authorization_endpoint = f"{settings.backend_base_url}/oauth/authorize"
    token_endpoint = f"{settings.backend_base_url}/oauth/token"

    return {
        "issuer": settings.backend_base_url,
        "authorization_endpoint": authorization_endpoint,
        "token_endpoint": token_endpoint,
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "token_endpoint_auth_methods_supported": [
            "client_secret_post",
            "client_secret_basic",
        ],
        "scopes_supported": ["mcp"],
        "code_challenge_methods_supported": ["S256"],
    }


@router.get("/.well-known/mcp-server")
def get_mcp_server_manifest():
    """Exposes the MCP server manifest detailing connection parameters."""
    return {
        "mcp_version": "2024-11-05",
        "name": settings.app_name,
        "endpoint": settings.mcp_endpoint_url,
        "transport": "streamable_http",
        "transports": ["streamable_http"],
        "description": "Secure MCP gateway for accessing approved SQL Server resources.",
        "capabilities": ["tools", "resources"],
        "trust_class": "public",
        "auth": {
            "required": True,
            "methods": ["oauth2"],
            "authorization_endpoint": f"{settings.backend_base_url}/oauth/authorize",
            "token_endpoint": f"{settings.backend_base_url}/oauth/token",
            "scopes": ["mcp"],
        },
    }
