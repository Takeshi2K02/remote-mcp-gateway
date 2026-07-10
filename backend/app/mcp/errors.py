from typing import Any
from fastapi import HTTPException, status
from app.core.sql_errors import SQLConnectionError, SQLQueryError

NO_ACCESS_MESSAGE = (
    "You don't currently have access to this resource on the gateway. "
    "Contact an administrator to request access."
)


def to_mcp_error_response(exc: Exception) -> dict[str, Any]:
    """
    Translate an exception raised during MCP tool execution into a
    structured, human-readable response that Claude can relay directly to
    the end user in chat.
    """
    if isinstance(exc, (SQLConnectionError, SQLQueryError)):
        return {
            "success": False,
            "error_type": exc.error_type,
            "error": str(exc),
        }

    if isinstance(exc, HTTPException):
        if exc.status_code == status.HTTP_403_FORBIDDEN:
            return {
                "success": False,
                "error_type": "authorization_error",
                "error": NO_ACCESS_MESSAGE,
            }
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            return {
                "success": False,
                "error_type": "not_found",
                "error": str(exc.detail),
            }
        return {
            "success": False,
            "error_type": "request_error",
            "error": str(exc.detail),
        }

    return {
        "success": False,
        "error_type": "execution_error",
        "error": str(exc),
    }
