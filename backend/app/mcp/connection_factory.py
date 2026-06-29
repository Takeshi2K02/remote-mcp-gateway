from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from app.core.key_vault import get_secret
from app.models.database import Database
from app.models.sql_server import SQLServer


class SQLConnectionFactory:
    """Builds SQLAlchemy engines for registered SQL Server databases."""

    def create_engine_for_database(
        self,
        sql_server: SQLServer,
        database: Database,
    ) -> Engine:
        if sql_server.authentication_type != "sql_password":
            raise ValueError(
                "Only sql_password authentication is supported for now."
            )

        if not sql_server.username or not sql_server.secret_reference:
            raise ValueError(
                "SQL username and secret_reference are required."
            )

        # secret_reference stores the Key Vault secret name, not the password.
        password = get_secret(sql_server.secret_reference)

        connection_url = (
            "mssql+pyodbc://"
            f"{quote_plus(sql_server.username)}:"
            f"{quote_plus(password)}@"
            f"{sql_server.host}:{sql_server.port}/"
            f"{quote_plus(database.name)}"
            "?driver=ODBC+Driver+18+for+SQL+Server"
            "&Encrypt=yes"
            "&TrustServerCertificate=no"
        )

        return create_engine(
            connection_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )