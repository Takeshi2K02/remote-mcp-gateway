import pytest
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.core.sql_errors import SQLConnectionError, SQLQueryError
from app.mcp.context import MCPContext
from app.services.sql_execution_service import SQLExecutionService


class FakeSettings:
    sql_max_rows = 100
    sql_query_timeout_seconds = 30


class FakeQueryGuard:
    def validate_read_only_query(self, query: str) -> None:
        if not query.lower().startswith("select"):
            raise ValueError("Only SELECT queries are allowed.")


class FakePermissionService:
    def authorize_query(self, context: MCPContext) -> None:
        if context.user_id == 999:
            raise ValueError("Unauthorized user")


class FakeQueryRewriter:
    def apply_row_limit(self, query: str, max_rows: int) -> str:
        return query


class FakeRow:
    def __init__(self, data: dict):
        self._mapping = data


class FakeResult:
    def fetchall(self):
        return [
            FakeRow({"id": 1, "name": "Alice"}),
            FakeRow({"id": 2, "name": "Bob"}),
        ]


class FakeConnection:
    def execute(self, *args, **kwargs):
        return FakeResult()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class FakeEngine:
    def connect(self):
        return FakeConnection()


class FakeConnectionManager:
    def get_engine(self, sql_server_id: int, database_id: int):
        return FakeEngine()


def create_context(user_id: int = 1) -> MCPContext:
    return MCPContext(
        user_id=user_id,
        entra_object_id="test-oid",
        email="test@example.com",
        sql_server_id=1,
        database_id=1,
    )


def create_service() -> SQLExecutionService:
    service = SQLExecutionService(
        db=None,
        connection_manager=FakeConnectionManager(),
        permission_service=FakePermissionService(),
        query_guard=FakeQueryGuard(),
        query_rewriter=FakeQueryRewriter(),
    )
    service.settings = FakeSettings()
    return service


def test_execute_select_query_returns_rows():
    service = create_service()

    rows = service.execute_select_query(
        context=create_context(),
        query="SELECT * FROM customers",
    )

    assert rows == [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"},
    ]


def test_execute_select_query_requires_sql_server_id():
    service = create_service()
    context = create_context()
    context.sql_server_id = None

    with pytest.raises(ValueError, match="sql_server_id is required"):
        service.execute_select_query(
            context=context,
            query="SELECT * FROM customers",
        )


def test_execute_select_query_requires_database_id():
    service = create_service()
    context = create_context()
    context.database_id = None

    with pytest.raises(ValueError, match="database_id is required"):
        service.execute_select_query(
            context=context,
            query="SELECT * FROM customers",
        )


def test_execute_select_query_rejects_non_select_query():
    service = create_service()

    with pytest.raises(ValueError, match="Only SELECT queries are allowed"):
        service.execute_select_query(
            context=create_context(),
            query="DELETE FROM customers",
        )


def test_execute_select_query_blocks_unauthorized_user():
    service = create_service()

    with pytest.raises(ValueError, match="Unauthorized user"):
        service.execute_select_query(
            context=create_context(user_id=999),
            query="SELECT * FROM customers",
        )


class RaisingConnectionManager:
    """Fake connection manager whose get_engine() always raises."""

    def __init__(self, exc: Exception):
        self._exc = exc

    def get_engine(self, sql_server_id: int, database_id: int):
        raise self._exc


def create_service_with_connection_manager(connection_manager) -> SQLExecutionService:
    service = SQLExecutionService(
        db=None,
        connection_manager=connection_manager,
        permission_service=FakePermissionService(),
        query_guard=FakeQueryGuard(),
        query_rewriter=FakeQueryRewriter(),
    )
    service.settings = FakeSettings()
    return service


def make_operational_error(driver_message: str) -> OperationalError:
    return OperationalError("SELECT 1", {}, Exception(driver_message))


def test_execute_select_query_surfaces_login_timeout_as_connection_timeout():
    exc = make_operational_error(
        "('HYT00', '[HYT00] [Microsoft][ODBC Driver 18 for SQL Server]"
        "Login timeout expired (0) (SQLDriverConnect)')"
    )
    service = create_service_with_connection_manager(RaisingConnectionManager(exc))

    with pytest.raises(SQLConnectionError) as exc_info:
        service.execute_select_query(
            context=create_context(),
            query="SELECT * FROM customers",
        )

    assert exc_info.value.error_type == "connection_timeout"
    assert "paused" in str(exc_info.value).lower()


def test_execute_select_query_surfaces_tcp_reset_as_connection_reset():
    exc = make_operational_error(
        "('08S01', '[08S01] [Microsoft][ODBC Driver 18 for SQL Server]"
        "TCP Provider: Error code 0x68 (104) (SQLExecDirectW)')"
    )
    service = create_service_with_connection_manager(RaisingConnectionManager(exc))

    with pytest.raises(SQLConnectionError) as exc_info:
        service.execute_select_query(
            context=create_context(),
            query="SELECT * FROM customers",
        )

    assert exc_info.value.error_type == "connection_reset"
    assert "retry" in str(exc_info.value).lower()




class RaisingOnExecuteConnection:
    """Fake connection whose execute() always raises - simulates the engine
    connecting successfully but the query itself failing."""

    def __init__(self, exc: Exception):
        self._exc = exc

    def execute(self, *args, **kwargs):
        raise self._exc

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class RaisingOnExecuteEngine:
    def __init__(self, exc: Exception):
        self._exc = exc

    def connect(self):
        return RaisingOnExecuteConnection(self._exc)


class RaisingOnExecuteConnectionManager:
    def __init__(self, exc: Exception):
        self._exc = exc

    def get_engine(self, sql_server_id: int, database_id: int):
        return RaisingOnExecuteEngine(self._exc)


def test_execute_select_query_surfaces_sql_syntax_error_distinctly_from_connection_error():
    """Regression test: a query-level error (invalid ORDER BY in a derived
    table, seen live from the row-limiting rewrite) must not be
    misclassified as a connection/firewall problem."""
    exc = ProgrammingError(
        "SELECT TOP (?) * FROM (...) AS gateway_limited_query",
        {},
        Exception(
            "('42000', '[42000] [Microsoft][ODBC Driver 18 for SQL Server]"
            "[SQL Server]The ORDER BY clause is invalid in views, inline "
            "functions, derived tables, subqueries, and common table "
            "expressions, unless TOP, OFFSET or FOR XML is also specified. "
            "(1033) (SQLExecDirectW)')"
        ),
    )
    service = create_service_with_connection_manager(
        RaisingOnExecuteConnectionManager(exc)
    )

    with pytest.raises(SQLQueryError) as exc_info:
        service.execute_select_query(
            context=create_context(),
            query="SELECT country, COUNT(*) FROM customers GROUP BY country ORDER BY 2",
        )

    assert exc_info.value.error_type == "sql_error"
    message = str(exc_info.value)
    assert "ORDER BY" in message
    # Must not be misdescribed as a connectivity/credentials problem.
    assert "verify host" not in message.lower()
    assert "credentials" not in message.lower()