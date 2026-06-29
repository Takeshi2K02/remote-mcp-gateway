import logging
from time import perf_counter
from typing import Any
from uuid import uuid4
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.mcp.connection_manager import SQLConnectionManager
from app.mcp.context import MCPContext
from app.mcp.permission_service import MCPPermissionService
from app.mcp.query_guard import MCPQueryGuard
from app.mcp.query_rewriter import MCPQueryRewriter
from app.schemas.audit_log import AuditLogCreate
from app.services.audit_log_service import AuditLogService

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
        audit_log_service: AuditLogService | None = None,
    ) -> None:
        self.db = db
        self.settings = get_settings()
        self.connection_manager = connection_manager or SQLConnectionManager(db)
        self.permission_service = permission_service or MCPPermissionService(db)
        self.query_guard = query_guard or MCPQueryGuard()
        self.query_rewriter = query_rewriter or MCPQueryRewriter()
        self.audit_log_service = audit_log_service or AuditLogService(db)

    def execute_select_query(
        self,
        context: MCPContext,
        query: str,
        parameters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        request_id = str(uuid4())
        start_time = perf_counter()

        if context.sql_server_id is None:
            raise ValueError("sql_server_id is required.")

        if context.database_id is None:
            raise ValueError("database_id is required.")

        try:
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
                duration_ms = int((perf_counter() - start_time) * 1000)

                self._record_audit_log(
                    context=context,
                    request_id=request_id,
                    query=query,
                    row_count=len(rows),
                    duration_ms=duration_ms,
                    status="success",
                    error_message=None,
                )

                return rows

        except SQLAlchemyError as exc:
            duration_ms = int((perf_counter() - start_time) * 1000)

            self._record_audit_log(
                context=context,
                request_id=request_id,
                query=query,
                row_count=None,
                duration_ms=duration_ms,
                status="failed",
                error_message="Database query execution failed.",
            )

            logger.warning("SQL query execution failed", exc_info=exc)
            raise RuntimeError("Database query execution failed.") from exc

        except Exception as exc:
            duration_ms = int((perf_counter() - start_time) * 1000)

            self._record_audit_log(
                context=context,
                request_id=request_id,
                query=query,
                row_count=None,
                duration_ms=duration_ms,
                status="failed",
                error_message=str(exc),
            )

            raise

    def _record_audit_log(
        self,
        context: MCPContext,
        request_id: str,
        query: str,
        row_count: int | None,
        duration_ms: int,
        status: str,
        error_message: str | None,
    ) -> None:
        try:
            self.audit_log_service.record(
                AuditLogCreate(
                    user_id=context.user_id,
                    sql_server_id=context.sql_server_id,
                    database_id=context.database_id,
                    table_id=context.table_id,
                    request_id=request_id,
                    tool_name="execute_query",
                    action="execute_select_query",
                    query_text=query,
                    row_count=row_count,
                    duration_ms=duration_ms,
                    status=status,
                    error_message=error_message,
                )
            )
        except Exception:
            logger.exception("Failed to persist audit log")