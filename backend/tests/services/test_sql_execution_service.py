import pytest
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