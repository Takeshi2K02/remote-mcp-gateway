from dataclasses import dataclass
from contextvars import ContextVar


@dataclass(slots=True)
class MCPRequestContext:
    """
    Holds client identity details for the duration of an MCP request.
    This context is set at the request entrypoint (e.g. middleware) and
    is accessed within individual tools to guarantee user security.
    """
    user_id: int
    entra_object_id: str
    email: str
    full_name: str | None = None
    scopes: list[str] | None = None


# ContextVar for storing the current request context in a task-local manner.
_current_context: ContextVar[MCPRequestContext | None] = ContextVar(
    "current_mcp_request_context", default=None
)


def set_current_context(context: MCPRequestContext) -> None:
    """
    Set the current MCP request context.
    """
    _current_context.set(context)


def get_current_context() -> MCPRequestContext:
    """
    Retrieve the current MCP request context.
    Raises ValueError if no context has been set.
    """
    ctx = _current_context.get()
    if ctx is None:
        raise ValueError("No active MCP request context found")
    return ctx


def clear_current_context() -> None:
    """
    Clear the current MCP request context.
    """
    _current_context.set(None)


@dataclass(slots=True)
class MCPContext:
    """
    Carries request-specific information through the MCP execution pipeline.

    Every MCP request will eventually have one context object containing
    the authenticated user and the target resource being accessed.
    """

    # Internal user ID from the gateway database.
    user_id: int

    # Microsoft Entra object ID (OID) from the access token.
    entra_object_id: str

    # User's email address.
    email: str

    # Optional target SQL Server.
    sql_server_id: int | None = None

    # Optional target database.
    database_id: int | None = None

    # Optional target table.
    table_id: int | None = None

    # JWT access token received from the client.
    access_token: str | None = None