from typing import Any
from mcp.server.fastmcp import FastMCP
from app.db.database import SessionLocal
from app.mcp.context import MCPContext, get_current_context
from app.services.sql_execution_service import SQLExecutionService


def register_query_tools(mcp: FastMCP) -> None:
    # TODO: Remove MCP debug logging after protocol verification
    print("Inside register_query_tools()...", flush=True)
    @mcp.tool()
    def execute_query(
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
            request_ctx = get_current_context()
            context = MCPContext(
                user_id=request_ctx.user_id,
                entra_object_id=request_ctx.entra_object_id,
                email=request_ctx.email,
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