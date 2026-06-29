from typing import Any
from mcp.server.fastmcp import FastMCP
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.database import Database
from app.models.database_table import DatabaseTable
from app.models.user_database_permission import UserDatabasePermission
from app.models.user_table_permission import UserTablePermission


def register_metadata_tools(mcp: FastMCP) -> None:
    @mcp.tool()
    def list_accessible_databases(user_id: int) -> list[dict[str, Any]]:
        """
        List databases the user is allowed to access.
        """
        db = SessionLocal()

        try:
            databases = (
                db.query(Database)
                .join(
                    UserDatabasePermission,
                    Database.id == UserDatabasePermission.database_id,
                )
                .filter(
                    UserDatabasePermission.user_id == user_id,
                    Database.is_active.is_(True),
                )
                .order_by(Database.name.asc())
                .all()
            )

            return [
                {
                    "id": database.id,
                    "name": database.name,
                    "sql_server_id": database.sql_server_id,
                    "description": database.description,
                }
                for database in databases
            ]

        finally:
            db.close()

    @mcp.tool()
    def list_accessible_tables(
        user_id: int,
        database_id: int,
    ) -> list[dict[str, Any]]:
        """
        List tables the user is allowed to access in a database.
        """
        db = SessionLocal()

        try:
            tables = (
                db.query(DatabaseTable)
                .join(
                    UserTablePermission,
                    DatabaseTable.id == UserTablePermission.table_id,
                )
                .filter(
                    UserTablePermission.user_id == user_id,
                    DatabaseTable.database_id == database_id,
                    DatabaseTable.is_active.is_(True),
                )
                .order_by(
                    DatabaseTable.schema_name.asc(),
                    DatabaseTable.table_name.asc(),
                )
                .all()
            )

            return [
                {
                    "id": table.id,
                    "database_id": table.database_id,
                    "schema_name": table.schema_name,
                    "table_name": table.table_name,
                    "description": table.description,
                }
                for table in tables
            ]

        finally:
            db.close()

    @mcp.tool()
    def describe_table(
        user_id: int,
        table_id: int,
    ) -> dict[str, Any]:
        """
        Return registered metadata for a table.
        """
        db = SessionLocal()

        try:
            table = (
                db.query(DatabaseTable)
                .join(
                    UserTablePermission,
                    DatabaseTable.id == UserTablePermission.table_id,
                )
                .filter(
                    UserTablePermission.user_id == user_id,
                    UserTablePermission.table_id == table_id,
                    DatabaseTable.is_active.is_(True),
                )
                .first()
            )

            if not table:
                return {
                    "found": False,
                    "message": "Table not found or user does not have access.",
                }

            return {
                "found": True,
                "id": table.id,
                "database_id": table.database_id,
                "schema_name": table.schema_name,
                "table_name": table.table_name,
                "description": table.description,
                "is_active": table.is_active,
            }

        finally:
            db.close()