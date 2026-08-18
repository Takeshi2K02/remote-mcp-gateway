"""
Covers the engine-level resume tolerance on app.db.database's do_connect hook.

Two distinct production failures drove this: pyodbc.OperationalError HYT00
("Login timeout expired") and pyodbc.Error HY000 with native code 40613
("Database is not currently available"), both raised from SQLDriverConnect
while the serverless metadata DB was auto-paused.

The fakes below mirror pyodbc's real hierarchy, where Error is the BASE class
and OperationalError derives from it. Getting that relationship right is the
whole point: the hook originally caught only OperationalError, so a 40613
arriving as the base Error was never retried.
"""

import pytest

from app.db.database import CONNECT_ATTEMPTS, connect_with_resume_retry


class FakeError(Exception):
    """Stands in for pyodbc.Error - the base of the DBAPI exception tree."""


class FakeDatabaseError(FakeError):
    pass


class FakeOperationalError(FakeDatabaseError):
    """Stands in for pyodbc.OperationalError."""


class FakeInterfaceError(FakeError):
    """Stands in for pyodbc.InterfaceError."""


HYT00 = (
    "HYT00",
    "[HYT00] [Microsoft][ODBC Driver 18 for SQL Server]"
    "Login timeout expired (0) (SQLDriverConnect)",
)

ERR_40613 = (
    "HY000",
    "[HY000] [Microsoft][ODBC Driver 18 for SQL Server][SQL Server]"
    "Database 'mcp-gateway-metadata' is not currently available.  Please "
    "retry the connection later. (40613) (SQLDriverConnect)",
)

BAD_LOGIN = (
    "28000",
    "[28000] [Microsoft][ODBC Driver 18 for SQL Server][SQL Server]"
    "Login failed for user 'sqladmin'. (18456) (SQLDriverConnect)",
)


class FakeDBAPI:
    """Minimal stand-in for the pyodbc module exposed as dialect.loaded_dbapi."""

    Error = FakeError
    DatabaseError = FakeDatabaseError
    OperationalError = FakeOperationalError
    InterfaceError = FakeInterfaceError

    def __init__(self, failures=0, error_cls=FakeOperationalError, args=HYT00):
        self.failures = failures
        self.error_cls = error_cls
        self.args_for_error = args
        self.calls = 0
        self.received: list[tuple] = []

    def connect(self, *cargs, **cparams):
        self.calls += 1
        self.received.append((cargs, cparams))
        if self.calls <= self.failures:
            raise self.error_cls(*self.args_for_error)
        return "connection"


class FakeDialect:
    def __init__(self, dbapi: FakeDBAPI):
        self.loaded_dbapi = dbapi


@pytest.fixture(autouse=True)
def _no_sleeping(monkeypatch):
    """Backoff is real time.sleep in production; keep the suite fast."""
    monkeypatch.setattr("app.core.retry.time.sleep", lambda _seconds: None)


def call(dbapi: FakeDBAPI):
    return connect_with_resume_retry(FakeDialect(dbapi), None, ("dsn",), {})


def test_connect_succeeds_immediately_when_database_is_awake():
    dbapi = FakeDBAPI()
    assert call(dbapi) == "connection"
    assert dbapi.calls == 1


def test_connect_retries_through_a_login_timeout():
    """The original HYT00 path must keep working."""
    dbapi = FakeDBAPI(failures=1, error_cls=FakeOperationalError, args=HYT00)
    assert call(dbapi) == "connection"
    assert dbapi.calls == 2


def test_connect_retries_a_40613_raised_as_the_base_error_class():
    """The regression this change fixes: Azure raises 40613 as the base
    pyodbc.Error, which an except clause naming OperationalError never sees."""
    dbapi = FakeDBAPI(failures=1, error_cls=FakeError, args=ERR_40613)
    assert call(dbapi) == "connection"
    assert dbapi.calls == 2


def test_connect_gives_up_on_40613_after_configured_attempts():
    dbapi = FakeDBAPI(failures=99, error_cls=FakeError, args=ERR_40613)
    with pytest.raises(FakeError):
        call(dbapi)
    assert dbapi.calls == CONNECT_ATTEMPTS


def test_connect_does_not_retry_a_rejected_login():
    """Widening the type filter to the base Error class must not make a bad
    password spend the retry budget."""
    dbapi = FakeDBAPI(failures=99, error_cls=FakeInterfaceError, args=BAD_LOGIN)
    with pytest.raises(FakeInterfaceError):
        call(dbapi)
    assert dbapi.calls == 1


def test_connect_forwards_connection_arguments_unchanged():
    dbapi = FakeDBAPI()
    connect_with_resume_retry(
        FakeDialect(dbapi), None, ("dsn-string",), {"timeout": 30}
    )
    assert dbapi.received == [(("dsn-string",), {"timeout": 30})]
