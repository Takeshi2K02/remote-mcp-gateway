from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from app.mcp.registry import register_tools
from app.core.config import get_settings


def create_mcp_server() -> FastMCP:
    settings = get_settings()

    # Parse allowed hosts
    allowed_hosts = []
    if settings.mcp_allowed_hosts:
        allowed_hosts = [h.strip() for h in settings.mcp_allowed_hosts.split(",") if h.strip()]

    # Ensure wildcard port variants are included for allowed hosts
    extra_hosts = []
    for host in allowed_hosts:
        if ":" not in host and host != "*":
            extra_hosts.append(f"{host}:*")
    allowed_hosts.extend(extra_hosts)

    # Parse allowed origins
    allowed_origins = []
    if settings.mcp_allowed_origins:
        allowed_origins = [o.strip() for o in settings.mcp_allowed_origins.split(",") if o.strip()]

    # Sensible default origins
    default_origins = [
        "https://claude.ai",
        "http://localhost:*",
        "https://localhost:*",
        "http://127.0.0.1:*",
        "https://127.0.0.1:*",
    ]
    if settings.frontend_base_url:
        default_origins.append(settings.frontend_base_url)
    if settings.backend_base_url:
        default_origins.append(settings.backend_base_url)

    # Derive origins from allowed hosts
    for host in allowed_hosts:
        if host != "*":
            base_host = host[:-2] if host.endswith(":*") else host
            default_origins.append(f"http://{base_host}")
            default_origins.append(f"https://{base_host}")
            if not host.endswith(":*") and ":" not in host:
                default_origins.append(f"http://{base_host}:*")
                default_origins.append(f"https://{base_host}:*")

    for origin in default_origins:
        if origin not in allowed_origins:
            allowed_origins.append(origin)

    transport_security = TransportSecuritySettings(
        enable_dns_rebinding_protection=settings.mcp_enable_dns_rebinding_protection,
        allowed_hosts=allowed_hosts,
        allowed_origins=allowed_origins,
    )

    mcp = FastMCP(
        name="Remote MCP Gateway",
        instructions=(
            "Secure MCP gateway for accessing approved SQL Server resources "
            "through authenticated and authorized tools."
        ),
        transport_security=transport_security,
    )

    register_tools(mcp)

    return mcp


def run() -> None:
    mcp = create_mcp_server()
    mcp.run()


if __name__ == "__main__":
    run()