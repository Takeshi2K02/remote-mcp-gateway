from mcp.server.fastmcp import FastMCP
from app.mcp.tools import (
    register_metadata_tools,
    register_query_tools,
)

def register_tools(mcp: FastMCP) -> None:
    """
    Register all MCP tools with the server.
    """

    @mcp.tool()
    def gateway_health() -> dict[str, str]:
        """
        Check whether the Remote MCP Gateway MCP server is running.
        """
        return {
            "status": "ok",
            "service": "remote-mcp-gateway",
        }

    register_metadata_tools(mcp)
    register_query_tools(mcp)