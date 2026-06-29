from mcp.server.fastmcp import FastMCP


def register_tools(mcp: FastMCP) -> None:
    @mcp.tool()
    def gateway_health() -> dict[str, str]:
        """
        Check whether the Remote MCP Gateway MCP server is running.
        """
        return {
            "status": "ok",
            "service": "remote-mcp-gateway",
        }