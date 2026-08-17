"""
Covers the engine-level resume tolerance added after /auth/callback returned
a 500 with pyodbc.OperationalError HYT00 "Login timeout expired" whenever the
serverless metadata DB had auto-paused.
"""

import pytest

from app.db.database import CONNECT_ATTEMPTS, connect_with_resume_retry


class FakeOperationalError(Exception):
    """Stands in for pyodbc.OperationalError."""


class FakeInterfaceError(Exception):
    """Stands in for pyodbc.InterfaceError, raised on a rejected login."""


class FakeDBAPI:
    """Minimal stand-in for the pyodbc module exposed as dialect.loaded_dbapi."""

    OperationalError = FakeOperationalError
    InterfaceError = FakeInterfaceError

    def __init__(self, failures: int, error: type[Exception] = FakeOperationalError):
        self.failures = failures
        self.error = error
        self.calls = 0
        self.received: list[tuple] = []

    def connect(self, *cargs, **cparams):
        self.calls += 1
        self.received.append((cargs, cparams))
        if self.calls <= self.failures:
            raise self.error("HYT00 Login timeout expired (0) (SQLDriverConnect)")
        return "connection"


class FakeDialect:
    def __init__(self, dbapi: FakeDBAPI):
        self.loaded_dbapi = dbapi


@pytest.fixture(autouse=True)
def _no_sleeping(monkeypatch):
    """Backoff is real time.sleep in production; keep the suite fast."""
    monkeypatch.setattr("app.core.retry.time.sleep", lambda _seconds: None)


def test_connect_succeeds_immediately_when_database_is_awake():
    dbapi = FakeDBAPI(failures=0)

    result = connect_with_resume_retry(FakeDialect(dbapi), None, ("dsn",), {})

    assert result == "connection"
    assert dbapi.calls == 1


def test_connect_retries_through_a_serverless_resume():
    """The first attempt hits the auto-paused database and times out; the
    retry lands after the resume completes."""
    dbapi = FakeDBAPI(failures=1)

    result = connect_with_resume_retry(FakeDialect(dbapi), None, ("dsn",), {})

    assert result == "connection"
    assert dbapi.calls == 2


def test_connect_gives_up_after_configured_attempts():
    dbapi = FakeDBAPI(failures=99)

    with pytest.raises(FakeOperationalError):
        connect_with_resume_retry(FakeDialect(dbapi), None, ("dsn",), {})

    assert dbapi.calls == CONNECT_ATTEMPTS


def test_connect_does_not_retry_a_rejected_login():
    """A bad password is permanent — it must surface at once rather than
    spending the resume budget."""
    dbapi = FakeDBAPI(failures=99, error=FakeInterfaceError)

    with pytest.raises(FakeInterfaceError):
        connect_with_resume_retry(FakeDialect(dbapi), None, ("dsn",), {})

    assert dbapi.calls == 1


def test_connect_forwards_connection_arguments_unchanged():
    dbapi = FakeDBAPI(failures=0)

    connect_with_resume_retry(
        FakeDialect(dbapi), None, ("dsn-string",), {"timeout": 30}
    )

    assert dbapi.received == [(("dsn-string",), {"timeout": 30})]
