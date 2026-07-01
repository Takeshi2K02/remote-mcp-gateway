from mcp.server.fastmcp import FastMCP
from app.mcp.tools import (
    register_metadata_tools,
    register_query_tools,
)

def register_tools(mcp: FastMCP) -> None:
    """
    Register all MCP tools with the server.
    """
    # TODO: Remove MCP debug logging after protocol verification
    print("Executing register_tools()...", flush=True)

    @mcp.tool()
    def gateway_health() -> dict[str, str]:
        """
        Check whether the Remote MCP Gateway MCP server is running.
        """
        return {
            "status": "ok",
            "service": "remote-mcp-gateway",
        }

    # TODO: Remove MCP debug logging after protocol verification
    print("Calling register_metadata_tools()...", flush=True)
    register_metadata_tools(mcp)

    # TODO: Remove MCP debug logging after protocol verification
    print("Calling register_query_tools()...", flush=True)
    register_query_tools(mcp)

    # TODO: Remove MCP debug logging after protocol verification
    print("Registered MCP tools:", flush=True)
    for name in mcp._tool_manager._tools.keys():
        print(f"- {name}", flush=True)
    print(f"FastMCP tool registry contains: {list(mcp._tool_manager._tools.keys())}", flush=True)