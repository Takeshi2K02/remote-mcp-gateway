from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from app.mcp.connection_factory import SQLConnectionFactory
from app.mcp.session_cache import SQLSessionCache
from app.models.database import Database
from app.models.sql_server import SQLServer


class SQLConnectionManager:
    """Coordinates SQL Server lookup, engine creation, and engine caching."""

    def __init__(
        self,
        db: Session,
        factory: SQLConnectionFactory | None = None,
        cache: SQLSessionCache | None = None,
    ) -> None:
        self.db = db
        self.factory = factory or SQLConnectionFactory()
        self.cache = cache or SQLSessionCache()

    def get_engine(
        self,
        sql_server_id: int,
        database_id: int,
    ) -> Engine:
        sql_server = self._get_sql_server(sql_server_id)
        database = self._get_database(database_id)

        if database.sql_server_id != sql_server.id:
            raise ValueError("Database does not belong to this SQL server.")

        cache_key = f"{sql_server.id}:{database.id}"
        cached_engine = self.cache.get(cache_key)

        if cached_engine:
            return cached_engine

        engine = self.factory.create_engine_for_database(
            sql_server=sql_server,
            database=database,
        )

        self.cache.set(cache_key, engine)
        return engine

    def _get_sql_server(self, sql_server_id: int) -> SQLServer:
        sql_server = (
            self.db.query(SQLServer)
            .filter(SQLServer.id == sql_server_id)
            .first()
        )

        if not sql_server:
            raise ValueError("SQL server not found.")

        if not sql_server.is_active:
            raise ValueError("SQL server is inactive.")

        return sql_server

    def _get_database(self, database_id: int) -> Database:
        database = (
            self.db.query(Database)
            .filter(Database.id == database_id)
            .first()
        )

        if not database:
            raise ValueError("Database not found.")

        if not database.is_active:
            raise ValueError("Database is inactive.")

        return database