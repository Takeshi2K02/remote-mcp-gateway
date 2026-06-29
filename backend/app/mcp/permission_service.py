from sqlalchemy.orm import Session
from app.auth.authorization import (
    require_database_access,
    require_sql_server_access,
    require_table_access,
)
from app.mcp.context import MCPContext
from app.models.user import User


class MCPPermissionService:
    """
    Executes authorization checks for MCP requests.

    This service bridges the MCP layer with the existing authorization
    helpers so that permissions are enforced before executing any tool.
    """

    def __init__(self, db: Session):
        self.db = db

    def authorize_sql_server(
        self,
        context: MCPContext,
        sql_server_id: int,
    ) -> None:
        """Verify the user can access the SQL Server."""
        require_sql_server_access(
            db=self.db,
            current_user=self._get_user(context.user_id),
            sql_server_id=sql_server_id,
        )

    def authorize_database(
        self,
        context: MCPContext,
        database_id: int,
    ) -> None:
        """Verify the user can access the database."""
        require_database_access(
            db=self.db,
            current_user=self._get_user(context.user_id),
            database_id=database_id,
        )

    def authorize_table(
        self,
        context: MCPContext,
        table_id: int,
    ) -> None:
        """Verify the user can access the table."""
        require_table_access(
            db=self.db,
            current_user=self._get_user(context.user_id),
            table_id=table_id,
        )

    def authorize_query(
        self,
        context: MCPContext,
    ) -> None:
        """
        Execute all applicable authorization checks for a query.

        SQL Server -> Database -> Table
        """

        if context.sql_server_id is not None:
            self.authorize_sql_server(
                context,
                context.sql_server_id,
            )

        if context.database_id is not None:
            self.authorize_database(
                context,
                context.database_id,
            )

        if context.table_id is not None:
            self.authorize_table(
                context,
                context.table_id,
            )

    def _get_user(self, user_id: int) -> User:
        """
        Load the authenticated user from the gateway database.
        """

        user = (
            self.db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise ValueError("Authenticated user not found.")

        return user