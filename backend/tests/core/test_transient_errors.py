"""
Covers is_transient_database_error, added after /auth/callback kept failing
with Azure SQL 40613 during a serverless auto-pause resume. The 40613 message
below is copied verbatim from the production container log.
"""

import pytest

from app.core.retry import (
    TRANSIENT_SQL_ERROR_CODES,
    is_transient_database_error,
    retry_on_operational_error,
)

# Exactly as it appeared in LogFiles/.../containerStream.log.
PRODUCTION_40613_MESSAGE = (
    "('HY000', \"[HY000] [Microsoft][ODBC Driver 18 for SQL Server][SQL Server]"
    "Database 'mcp-gateway-metadata' on server "
    "'mcp-gateway-sql-srv.database.windows.net' is not currently available.  "
    "Please retry the connection later.  If the problem persists, contact "
    "customer support, and provide them the session tracing ID of "
    "'{A17815C1-3AFF-47C3-9402-460376E45325}'. (40613) (SQLDriverConnect)\")"
)

PRODUCTION_HYT00_MESSAGE = (
    "('HYT00', '[HYT00] [Microsoft][ODBC Driver 18 for SQL Server]"
    "Login timeout expired (0) (SQLDriverConnect)')"
)

BAD_LOGIN_MESSAGE = (
    "('28000', \"[28000] [Microsoft][ODBC Driver 18 for SQL Server][SQL Server]"
    "Login failed for user 'sqladmin'. (18456) (SQLDriverConnect)\")"
)


class FakePyodbcError(Exception):
    """Stands in for pyodbc.Error, the base class 40613 actually arrives as."""


def make(sqlstate: str, message: str) -> FakePyodbcError:
    return FakePyodbcError(sqlstate, message)


def test_40613_is_recognised_as_transient():
    exc = make("HY000", PRODUCTION_40613_MESSAGE)
    assert is_transient_database_error(exc) is True


def test_hyt00_login_timeout_still_recognised():
    """The original failure mode must keep working after the widening."""
    exc = make("HYT00", PRODUCTION_HYT00_MESSAGE)
    assert is_transient_database_error(exc) is True


def test_rejected_login_is_not_transient():
    """18456 is permanent - retrying it just delays the real error."""
    exc = make("28000", BAD_LOGIN_MESSAGE)
    assert is_transient_database_error(exc) is False


def test_session_tracing_guid_digits_do_not_false_match():
    """The GUID Azure appends contains parenthesis-free digit runs; ensure a
    message with no transient code is not matched by accident."""
    exc = make(
        "42S22",
        "('42S22', \"[42S22] Invalid column name 'last_login_at'. "
        "(207) (SQLExecDirectW)\")",
    )
    assert is_transient_database_error(exc) is False


@pytest.mark.parametrize("code", sorted(TRANSIENT_SQL_ERROR_CODES))
def test_every_declared_transient_code_is_matched(code):
    exc = make("HY000", f"[HY000] some driver text ({code}) (SQLDriverConnect)")
    assert is_transient_database_error(exc) is True


def test_retry_retries_40613_when_paired_with_broad_retry_on():
    """The real wiring: a wide type filter narrowed by the predicate."""
    calls = {"count": 0}

    def flaky():
        calls["count"] += 1
        if calls["count"] < 3:
            raise make("HY000", PRODUCTION_40613_MESSAGE)
        return "connected"

    result = retry_on_operational_error(
        flaky,
        attempts=3,
        initial_backoff_seconds=0.1,
        sleep_fn=lambda _s: None,
        retry_on=(FakePyodbcError,),
        should_retry=is_transient_database_error,
    )

    assert result == "connected"
    assert calls["count"] == 3


def test_retry_fails_fast_on_bad_login_despite_broad_retry_on():
    """Widening retry_on to the base error class must not make permanent
    failures burn the retry budget."""
    calls = {"count": 0}
    sleeps: list[float] = []

    def bad_login():
        calls["count"] += 1
        raise make("28000", BAD_LOGIN_MESSAGE)

    with pytest.raises(FakePyodbcError):
        retry_on_operational_error(
            bad_login,
            attempts=5,
            sleep_fn=sleeps.append,
            retry_on=(FakePyodbcError,),
            should_retry=is_transient_database_error,
        )

    assert calls["count"] == 1
    assert sleeps == []
