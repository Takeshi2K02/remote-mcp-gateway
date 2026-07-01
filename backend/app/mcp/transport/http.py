from app.mcp.server import create_mcp_server

# Instantiate the FastMCP server with registered tools
mcp_server = create_mcp_server()

# Adjust path setting so that when mounted as a sub-app, it matches the mount root
mcp_server.settings.streamable_http_path = "/"

# Retrieve the standard Starlette ASGI application
mcp_asgi_app = mcp_server.streamable_http_app()

# Extract and export the session manager
session_manager = mcp_server.session_manager
