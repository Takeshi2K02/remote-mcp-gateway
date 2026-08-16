import pytest
from fastapi import HTTPException

from app.models.sql_server import SQLServer
from app.services.sql_server_discovery_service import SQLServerDiscoveryService


class FakeSQLServerRepo:
    def __init__(self, sql_server: SQLServer | None):
        self._sql_server = sql_server

    def get_by_id(self, sql_server_id: int):
        return self._sql_server


class FakeDatabaseRepo:
    def list_by_server(self, sql_server_id: int):
        return []


class FakeTableRepo:
    pass


class RaisingFactory:
    """Fake SQLConnectionFactory whose engine creation always raises."""

    def __init__(self, exc: Exception):
        self._exc = exc

    def create_engine_for_server(self, sql_server):
        raise self._exc

    def create_engine_for_database(self, sql_server, database):
        raise self._exc


def make_sql_server(**overrides) -> SQLServer:
    defaults = dict(
        id=3,
        name="MeridianRetailDW - SEA Prod",
        host="sql-meridianretail-sea-prod.database.windows.net",
        port=1433,
        authentication_type="sql_password",
        username="meridianretail_app_reader",
        secret_reference="meridianretail-sql-app-password",
    )
    defaults.update(overrides)
    return SQLServer(**defaults)


def make_service(sql_server: SQLServer, factory) -> SQLServerDiscoveryService:
    service = SQLServerDiscoveryService(db=None, factory=factory)
    service.sql_server_repo = FakeSQLServerRepo(sql_server)
    service.database_repo = FakeDatabaseRepo()
    service.table_repo = FakeTableRepo()
    return service



def test_sync_all_returns_400_for_misconfigured_sql_server():
    sql_server = make_sql_server(authentication_type="active_directory")
    factory = RaisingFactory(
        ValueError("Only sql_password authentication is supported for now.")
    )
    service = make_service(sql_server, factory)

    with pytest.raises(HTTPException) as exc_info:
        service.sync_all(sql_server.id)

    assert exc_info.value.status_code == 400


def test_sync_all_raises_404_when_sql_server_missing():
    service = make_service(None, RaisingFactory(RuntimeError("unused")))

    with pytest.raises(HTTPException) as exc_info:
        service.sync_all(999)

    assert exc_info.value.status_code == 404
