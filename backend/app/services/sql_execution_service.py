import logging
from time import perf_counter
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.mcp.connection_manager import SQLConnectionManager
from app.mcp.context import MCPContext
from app.mcp.permission_service import MCPPermissionService
from app.mcp.query_guard import MCPQueryGuard
from app.mcp.query_rewriter import MCPQueryRewriter

logger = logging.getLogger(__name__)


class SQLExecutionService:
    """Executes authorized read-only SQL queries."""

    def __init__(
        self,
        db: Session,
        connection_manager: SQLConnectionManager | None = None,
        permission_service: MCPPermissionService | None = None,
        query_guard: MCPQueryGuard | None = None,
        query_rewriter: MCPQueryRewriter | None = None,
    ) -> None:
        self.db = db
        self.settings = get_settings()
        self.connection_manager = connection_manager or SQLConnectionManager(db)
        self.permission_service = permission_service or MCPPermissionService(db)
        self.query_guard = query_guard or MCPQueryGuard()
        self.query_rewriter = query_rewriter or MCPQueryRewriter()

    def execute_select_query(
        self,
        context: MCPContext,
        query: str,
        parameters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        start_time = perf_counter()

        if context.sql_server_id is None:
            raise ValueError("sql_server_id is required.")

        if context.database_id is None:
            raise ValueError("database_id is required.")

        self.query_guard.validate_read_only_query(query)
        self.permission_service.authorize_query(context)

        limited_query = self.query_rewriter.apply_row_limit(
            query=query,
            max_rows=self.settings.sql_max_rows,
        )

        execution_parameters = {
            **(parameters or {}),
            "gateway_max_rows": self.settings.sql_max_rows,
        }

        engine = self.connection_manager.get_engine(
            sql_server_id=context.sql_server_id,
            database_id=context.database_id,
        )

        try:
            with engine.connect() as connection:
                connection.execute(
                    text(
                        "SET LOCK_TIMEOUT "
                        f"{self.settings.sql_query_timeout_seconds * 1000}"
                    )
                )

                result = connection.execute(
                    text(limited_query),
                    execution_parameters,
                )

                rows = [dict(row._mapping) for row in result.fetchall()]
                duration_ms = round((perf_counter() - start_time) * 1000, 2)

                self._log_success(
                    context=context,
                    row_count=len(rows),
                    duration_ms=duration_ms,
                )

                return rows

        except SQLAlchemyError as exc:
            duration_ms = round((perf_counter() - start_time) * 1000, 2)

            self._log_failure(
                context=context,
                duration_ms=duration_ms,
                error=exc,
            )

            raise RuntimeError("Database query execution failed.") from exc

    def _log_success(
        self,
        context: MCPContext,
        row_count: int,
        duration_ms: float,
    ) -> None:
        # TODO: Persist this to audit_logs during the Audit Logging milestone.
        logger.info(
            "SQL query executed successfully",
            extra={
                "user_id": context.user_id,
                "sql_server_id": context.sql_server_id,
                "database_id": context.database_id,
                "table_id": context.table_id,
                "row_count": row_count,
                "duration_ms": duration_ms,
                "status": "success",
            },
        )

    def _log_failure(
        self,
        context: MCPContext,
        duration_ms: float,
        error: Exception,
    ) -> None:
        # TODO: Persist this to audit_logs during the Audit Logging milestone.
        logger.warning(
            "SQL query execution failed",
            extra={
                "user_id": context.user_id,
                "sql_server_id": context.sql_server_id,
                "database_id": context.database_id,
                "table_id": context.table_id,
                "duration_ms": duration_ms,
                "status": "failed",
                "error_type": type(error).__name__,
            },
        )