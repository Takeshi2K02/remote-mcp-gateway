from dataclasses import dataclass


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