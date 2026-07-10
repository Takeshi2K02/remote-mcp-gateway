from fastapi import HTTPException, status
from app.core.sql_errors import SQLConnectionErrorInfo, SQLConnectionError
from app.mcp.errors import NO_ACCESS_MESSAGE, to_mcp_error_response


def test_forbidden_http_exception_maps_to_actionable_no_access_message():
    exc = HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="internal detail")
    result = to_mcp_error_response(exc)

    assert result["success"] is False
    assert result["error_type"] == "authorization_error"
    assert result["error"] == NO_ACCESS_MESSAGE
    assert "contact an administrator" in result["error"].lower()


def test_not_found_http_exception_preserves_detail():
    exc = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Database not found")
    result = to_mcp_error_response(exc)

    assert result["success"] is False
    assert result["error_type"] == "not_found"
    assert result["error"] == "Database not found"


def test_other_http_exception_maps_to_request_error():
    exc = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bad request")
    result = to_mcp_error_response(exc)

    assert result["success"] is False
    assert result["error_type"] == "request_error"
    assert result["error"] == "bad request"


def test_generic_exception_maps_to_execution_error():
    exc = ValueError("sql_server_id is required.")
    result = to_mcp_error_response(exc)

    assert result["success"] is False
    assert result["error_type"] == "execution_error"
    assert result["error"] == "sql_server_id is required."


def test_sql_connection_error_preserves_distinct_error_type():
    exc = SQLConnectionError(
        SQLConnectionErrorInfo(
            error_type="connection_timeout",
            message="Connection timeout while reaching 'SQL Server 3'.",
        )
    )
    result = to_mcp_error_response(exc)

    assert result["success"] is False
    assert result["error_type"] == "connection_timeout"
    assert result["error"] == "Connection timeout while reaching 'SQL Server 3'."
