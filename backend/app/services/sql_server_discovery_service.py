"""
SQL Server Discovery Service

Responsible for connecting to registered SQL Servers and automatically
discovering all user databases and their tables. This keeps the admin portal
synchronized without manual registration of individual databases or tables.
"""

import logging
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.mcp.connection_factory import SQLConnectionFactory
from app.models.database import Database
from app.models.sql_server import SQLServer
from app.repositories.database_repository import DatabaseRepository
from app.repositories.database_table_repository import DatabaseTableRepository
from app.repositories.sql_server_repository import SQLServerRepository
from app.schemas.sync import FailedDatabase, SyncResponse

logger = logging.getLogger(__name__)

# System databases to exclude from discovery
_SYSTEM_DATABASES = {"master", "model", "msdb", "tempdb"}


class SQLServerDiscoveryService:
    """
    Discovers and synchronizes databases and tables from a registered
    SQL Server into the gateway's own database.

    Usage pattern:
        service = SQLServerDiscoveryService(db)
        result = service.sync_all(sql_server_id)
    """

    def __init__(
        self,
        db: Session,
        factory: SQLConnectionFactory | None = None,
    ) -> None:
        self.db = db
        self.factory = factory or SQLConnectionFactory()
        self.sql_server_repo = SQLServerRepository(db)
        self.database_repo = DatabaseRepository(db)
        self.table_repo = DatabaseTableRepository(db)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def sync_all(self, sql_server_id: int) -> SyncResponse:
        """
        Full synchronization: discover databases, then tables for each DB.

        If table discovery fails for an individual database the error is
        captured and the remaining databases continue to be processed.
        """
        sql_server = self._get_sql_server(sql_server_id)

        logger.info(
            "Starting full sync for SQL Server %d (%s)",
            sql_server.id,
            sql_server.name,
        )

        db_result = self._sync_databases(sql_server)
        all_databases = self.database_repo.list_by_server(sql_server_id)

        tables_added = 0
        tables_updated = 0
        failed: list[FailedDatabase] = []

        for database in all_databases:
            try:
                t_result = self._sync_tables(sql_server, database)
                tables_added += t_result["tables_added"]
                tables_updated += t_result["tables_updated"]
            except Exception as exc:
                error_msg = str(exc)
                logger.warning(
                    "Table sync failed for database '%s' (id=%d) on SQL Server %d: %s",
                    database.name,
                    database.id,
                    sql_server_id,
                    error_msg,
                )
                failed.append(
                    FailedDatabase(
                        database_id=database.id,
                        name=database.name,
                        error=error_msg,
                    )
                )

        logger.info(
            "SQL Server %d sync complete — databases: +%d updated %d | "
            "tables: +%d updated %d | failures: %d",
            sql_server_id,
            db_result["databases_added"],
            db_result["databases_updated"],
            tables_added,
            tables_updated,
            len(failed),
        )

        return SyncResponse(
            databases_added=db_result["databases_added"],
            databases_updated=db_result["databases_updated"],
            tables_added=tables_added,
            tables_updated=tables_updated,
            failed_databases=failed,
        )

    def sync_databases(self, sql_server_id: int) -> SyncResponse:
        """Synchronize only the database list for a given SQL Server."""
        sql_server = self._get_sql_server(sql_server_id)
        result = self._sync_databases(sql_server)
        return SyncResponse(**result)

    def sync_tables(self, database_id: int) -> SyncResponse:
        """Synchronize tables for a single already-discovered database."""
        database = self.database_repo.get_by_id(database_id)

        if not database:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Database not found",
            )

        sql_server = self._get_sql_server(database.sql_server_id)

        result = self._sync_tables(sql_server, database)
        return SyncResponse(
            tables_added=result["tables_added"],
            tables_updated=result["tables_updated"],
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_sql_server(self, sql_server_id: int) -> SQLServer:
        sql_server = self.sql_server_repo.get_by_id(sql_server_id)

        if not sql_server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SQL server not found",
            )

        return sql_server

    def _sync_databases(self, sql_server: SQLServer) -> dict:
        """
        Connect to master and enumerate all user databases.
        Uses: SELECT name FROM sys.databases WHERE database_id > 4
        """
        logger.info(
            "Discovering databases on SQL Server %d (%s)",
            sql_server.id,
            sql_server.name,
        )

        try:
            engine = self.factory.create_engine_for_server(sql_server)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        try:
            with engine.connect() as conn:
                rows = conn.execute(
                    text(
                        "SELECT name FROM sys.databases WHERE database_id > 4"
                    )
                ).fetchall()
        except SQLAlchemyError as exc:
            logger.error(
                "Failed to connect to SQL Server %d for database discovery: %s",
                sql_server.id,
                exc,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    f"Could not connect to SQL Server '{sql_server.name}' "
                    "to discover databases. Verify host, port, and credentials."
                ),
            ) from exc
        finally:
            engine.dispose()

        discovered_names: list[str] = [
            row[0]
            for row in rows
            if row[0].lower() not in _SYSTEM_DATABASES
        ]

        added = 0
        updated = 0

        for name in discovered_names:
            _, created = self.database_repo.upsert(
                sql_server_id=sql_server.id,
                name=name,
            )
            if created:
                added += 1
            else:
                updated += 1

        logger.info(
            "SQL Server %d — discovered %d databases (%d new, %d updated)",
            sql_server.id,
            len(discovered_names),
            added,
            updated,
        )

        return {"databases_added": added, "databases_updated": updated}

    def _sync_tables(self, sql_server: SQLServer, database: Database) -> dict:
        """
        Connect to a specific database and enumerate all base tables.
        Uses: SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
              WHERE TABLE_TYPE = 'BASE TABLE'
        """
        logger.info(
            "Discovering tables in database '%s' (id=%d) on SQL Server %d",
            database.name,
            database.id,
            sql_server.id,
        )

        try:
            engine = self.factory.create_engine_for_database(sql_server, database)
        except ValueError as exc:
            raise RuntimeError(str(exc)) from exc

        try:
            with engine.connect() as conn:
                rows = conn.execute(
                    text(
                        "SELECT TABLE_SCHEMA, TABLE_NAME "
                        "FROM INFORMATION_SCHEMA.TABLES "
                        "WHERE TABLE_TYPE = 'BASE TABLE'"
                    )
                ).fetchall()
        except SQLAlchemyError as exc:
            logger.warning(
                "Failed to query tables in database '%s' (id=%d): %s",
                database.name,
                database.id,
                exc,
            )
            raise RuntimeError(
                f"Could not connect to database '{database.name}': {exc}"
            ) from exc
        finally:
            engine.dispose()

        added = 0
        updated = 0

        for schema_name, table_name in rows:
            _, created = self.table_repo.upsert(
                database_id=database.id,
                schema_name=schema_name,
                table_name=table_name,
            )
            if created:
                added += 1
            else:
                updated += 1

        logger.info(
            "Database '%s' (id=%d) — discovered %d tables (%d new, %d updated)",
            database.name,
            database.id,
            len(rows),
            added,
            updated,
        )

        return {"tables_added": added, "tables_updated": updated}
