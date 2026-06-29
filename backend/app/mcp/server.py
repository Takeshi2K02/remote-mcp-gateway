from mcp.server.fastmcp import FastMCP
from app.mcp.registry import register_tools


def create_mcp_server() -> FastMCP:
    mcp = FastMCP(
        name="Remote MCP Gateway",
        instructions=(
            "Secure MCP gateway for accessing approved SQL Server resources "
            "through authenticated and authorized tools."
        ),
    )

    register_tools(mcp)

    return mcp


def run() -> None:
    mcp = create_mcp_server()
    mcp.run()


if __name__ == "__main__":
    run()