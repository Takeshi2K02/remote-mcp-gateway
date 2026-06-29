from app.db.database import SessionLocal
from app.mcp.context import MCPContext
from app.services.sql_execution_service import SQLExecutionService


db = SessionLocal()

try:
    context = MCPContext(
        user_id=1,                 # change if needed
        entra_object_id="manual-test",
        email="manual-test@example.com",
        sql_server_id=2,            # your SQL server id
        database_id=2,              # your database id
        table_id=None,              # add table id if testing table permission
    )

    service = SQLExecutionService(db)

    rows = service.execute_select_query(
        context=context,
        query="SELECT 1 AS test_value",
    )

    print("Query succeeded")
    print(rows)

finally:
    db.close()