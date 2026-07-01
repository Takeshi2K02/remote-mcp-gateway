import inspect
import pytest
from app.mcp.transport.http import mcp_server
from app.mcp.context import (
    MCPRequestContext,
    set_current_context,
    get_current_context,
    clear_current_context,
)


@pytest.mark.anyio
async def test_mcp_tools_signatures_no_user_identity():
    """Verify that all registered MCP tools do not accept user identity parameters."""
    tools = await mcp_server.list_tools()
    identity_params = {"user_id", "email", "entra_object_id", "full_name"}

    for tool in tools:
        params = set(tool.inputSchema.get("properties", {}).keys())
        # Assert that no identity parameters are present in the input schema properties
        overlap = params.intersection(identity_params)
        assert not overlap, f"Tool '{tool.name}' exposes user identity parameters in input schema: {overlap}"


def test_mcp_request_context_management():
    """Test setting, getting, and clearing the MCP request context."""
    # Ensure clear state
    clear_current_context()

    # When no context is set, it should raise ValueError
    with pytest.raises(ValueError) as exc_info:
        get_current_context()
    assert "No active MCP request context found" in str(exc_info.value)

    # Set a custom context
    custom_ctx = MCPRequestContext(
        user_id=123,
        entra_object_id="custom-oid",
        email="custom@example.com",
        full_name="Custom User",
        scopes=["mcp"]
    )
    set_current_context(custom_ctx)

    active_ctx = get_current_context()
    assert active_ctx.user_id == 123
    assert active_ctx.email == "custom@example.com"
    assert active_ctx.entra_object_id == "custom-oid"
    assert active_ctx.full_name == "Custom User"
    assert active_ctx.scopes == ["mcp"]

    # Clear context and verify it raises ValueError again
    clear_current_context()
    with pytest.raises(ValueError) as exc_info:
        get_current_context()
    assert "No active MCP request context found" in str(exc_info.value)
