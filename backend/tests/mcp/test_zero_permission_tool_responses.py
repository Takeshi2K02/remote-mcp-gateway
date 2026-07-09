import json
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.database
import app.mcp.tools.metadata_tools
import app.mcp.tools.query_tools
from app.db.database import Base
from app.mcp.context import MCPRequestContext, set_current_context, clear_current_context
from app.mcp.transport.http import mcp_server
from app.models.database import Database
from app.models.sql_server import SQLServer
from app.models.user import User

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    original_db = app.db.database.SessionLocal
    original_metadata_tools = app.mcp.tools.metadata_tools.SessionLocal
    original_query_tools = app.mcp.tools.query_tools.SessionLocal

    app.db.database.SessionLocal = TestingSessionLocal
    app.mcp.tools.metadata_tools.SessionLocal = TestingSessionLocal
    app.mcp.tools.query_tools.SessionLocal = TestingSessionLocal

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    zero_permission_user = User(
        id=1,
        entra_object_id="zero-perm-oid",
        email="zero-perm@example.com",
        full_name="Zero Permission User",
        is_active=True,
    )
    db.add(zero_permission_user)
    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        app.db.database.SessionLocal = original_db
        app.mcp.tools.metadata_tools.SessionLocal = original_metadata_tools
        app.mcp.tools.query_tools.SessionLocal = original_query_tools


@pytest.fixture(autouse=True)
def zero_permission_context():
    set_current_context(
        MCPRequestContext(
            user_id=1,
            entra_object_id="zero-perm-oid",
            email="zero-perm@example.com",
            full_name="Zero Permission User",
            scopes=["mcp"],
        )
    )
    yield
    clear_current_context()


def _extract_payload(result):
    """
    call_tool(..., convert_result=True) returns a
    (list[ContentBlock], structured_dict) tuple. Prefer the structured
    dict; fall back to parsing the text content block's JSON if needed.
    """
    if isinstance(result, tuple) and len(result) == 2:
        _blocks, structured = result
        if isinstance(structured, dict):
            return structured
        result = _blocks

    if isinstance(result, dict):
        return result

    for block in result:
        text = getattr(block, "text", None)
        if text:
            return json.loads(text)

    pytest.fail(f"Could not extract a JSON payload from tool result: {result!r}")


@pytest.mark.anyio
async def test_list_accessible_databases_zero_permission_user(db_session):
    result = await mcp_server.call_tool("list_accessible_databases", {})
    payload = _extract_payload(result)

    assert payload["success"] is True
    assert payload["count"] == 0
    assert payload["databases"] == []
    assert "no access" in payload["message"].lower() or "don't currently have access" in payload["message"].lower()
    assert "administrator" in payload["message"].lower()


@pytest.mark.anyio
async def test_list_accessible_tables_zero_permission_user(db_session):
    sql_server = SQLServer(id=1, name="Server A", host="a.database.windows.net")
    database = Database(id=1, sql_server_id=1, name="SomeDB")
    db_session.add_all([sql_server, database])
    db_session.commit()

    result = await mcp_server.call_tool("list_accessible_tables", {"database_id": 1})
    payload = _extract_payload(result)

    assert payload["success"] is True
    assert payload["count"] == 0
    assert payload["tables"] == []
    assert "administrator" in payload["message"].lower()


@pytest.mark.anyio
async def test_execute_query_zero_permission_user_returns_authorization_error(db_session):
    sql_server = SQLServer(id=1, name="Server A", host="a.database.windows.net")
    database = Database(id=1, sql_server_id=1, name="SomeDB")
    db_session.add_all([sql_server, database])
    db_session.commit()

    result = await mcp_server.call_tool(
        "execute_query",
        {
            "sql_server_id": 1,
            "database_id": 1,
            "query": "SELECT 1",
        },
    )
    payload = _extract_payload(result)

    assert payload["success"] is False
    assert payload["error_type"] == "authorization_error"
    assert "administrator" in payload["error"].lower()
    assert "contact" in payload["error"].lower()
