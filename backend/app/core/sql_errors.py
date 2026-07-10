"""
Shared translation of raw SQL/Key Vault connection errors into distinct,
actionable error types and human-readable messages. Used by both the
discovery/sync flow and query execution so a given underlying failure
(login timeout, connection reset, Key Vault auth failure, etc.) is always
described the same way, instead of collapsing into a single generic string.
"""

from dataclasses import dataclass

from app.core.key_vault import SecretResolutionError


@dataclass(frozen=True)
class SQLConnectionErrorInfo:
    error_type: str
    message: str


def classify_sql_connection_error(
    server_name: str, exc: Exception
) -> SQLConnectionErrorInfo:
    """Translate a raw SQLAlchemy/pyodbc/Key Vault error into a distinct
    error type and actionable message."""
    if isinstance(exc, SecretResolutionError):
        return SQLConnectionErrorInfo(
            error_type="key_vault_error",
            message=f"Could not retrieve credentials for '{server_name}': {exc}",
        )

    text_ = str(exc)

    if "Login failed" in text_ or "28000" in text_:
        return SQLConnectionErrorInfo(
            error_type="sql_authentication_error",
            message=(
                f"SQL authentication failed for '{server_name}'. "
                "Verify the username and password are correct."
            ),
        )

    if "timeout" in text_.lower() or "HYT00" in text_:
        return SQLConnectionErrorInfo(
            error_type="connection_timeout",
            message=(
                f"Connection timeout while reaching '{server_name}'. The "
                "database may be paused (serverless auto-resume) or "
                "unreachable — check firewall rules and network "
                "connectivity, or retry shortly."
            ),
        )

    if "08S01" in text_ or "0x68" in text_:
        return SQLConnectionErrorInfo(
            error_type="connection_reset",
            message=(
                f"Connection to '{server_name}' was reset while the query "
                "was running. This is usually transient — retry the query."
            ),
        )

    return SQLConnectionErrorInfo(
        error_type="connection_error",
        message=(
            f"Could not connect to SQL Server '{server_name}'. Verify host, "
            f"port, and credentials. Details: {text_.splitlines()[0]}"
        ),
    )


def describe_sql_connection_error(server_name: str, exc: Exception) -> str:
    """Message-only convenience wrapper around classify_sql_connection_error."""
    return classify_sql_connection_error(server_name, exc).message


class SQLConnectionError(RuntimeError):
    """
    Raised when a query fails due to a connection-level problem (timeout,
    reset, auth failure) rather than a query/authorization problem. Carries
    `error_type` so callers (e.g. the MCP error formatter) can surface a
    distinct, actionable message instead of a generic failure string.
    """

    def __init__(self, info: SQLConnectionErrorInfo):
        super().__init__(info.message)
        self.error_type = info.error_type
