from typing import Any
from mcp.server.fastmcp import FastMCP
from app.db.database import SessionLocal
from app.mcp.context import MCPContext
from app.services.sql_execution_service import SQLExecutionService


def register_query_tools(mcp: FastMCP) -> None:
    @mcp.tool()
    def execute_query(
        user_id: int,
        entra_object_id: str,
        email: str,
        sql_server_id: int,
        database_id: int,
        query: str,
        table_id: int | None = None,
        parameters: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Execute an authorized read-only SQL query.
        """

        db = SessionLocal()

        try:
            context = MCPContext(
                user_id=user_id,
                entra_object_id=entra_object_id,
                email=email,
                sql_server_id=sql_server_id,
                database_id=database_id,
                table_id=table_id,
            )

            service = SQLExecutionService(db)

            rows = service.execute_select_query(
                context=context,
                query=query,
                parameters=parameters,
            )

            return {
                "success": True,
                "row_count": len(rows),
                "rows": rows,
            }

        except Exception as exc:
            return {
                "success": False,
                "error": str(exc),
                "error_type": type(exc).__name__,
            }

        finally:
            db.close()