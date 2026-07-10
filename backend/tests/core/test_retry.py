import pytest
from sqlalchemy.exc import OperationalError

from app.core.retry import retry_on_operational_error


def make_operational_error() -> OperationalError:
    return OperationalError(
        "SELECT 1",
        {},
        Exception(
            "('HYT00', '[HYT00] [Microsoft][ODBC Driver 18 for SQL Server]"
            "Login timeout expired (0) (SQLDriverConnect)')"
        ),
    )


def test_retry_succeeds_after_simulated_resume_delay():
    """Simulates an Azure SQL serverless resume: the first two attempts
    fail with a login timeout while the database wakes up, the third
    succeeds once it's warm."""
    calls = {"count": 0}
    sleeps: list[float] = []

    def flaky():
        calls["count"] += 1
        if calls["count"] < 3:
            raise make_operational_error()
        return "connected"

    result = retry_on_operational_error(
        flaky,
        attempts=5,
        initial_backoff_seconds=1.0,
        sleep_fn=sleeps.append,
    )

    assert result == "connected"
    assert calls["count"] == 3
    assert sleeps == [1.0, 2.0]


def test_retry_raises_after_exhausting_attempts():
    calls = {"count": 0}

    def always_fails():
        calls["count"] += 1
        raise make_operational_error()

    with pytest.raises(OperationalError):
        retry_on_operational_error(
            always_fails,
            attempts=3,
            initial_backoff_seconds=0.1,
            sleep_fn=lambda _seconds: None,
        )

    assert calls["count"] == 3


def test_retry_does_not_retry_non_operational_errors():
    def raises_value_error():
        raise ValueError("not a connection problem")

    with pytest.raises(ValueError):
        retry_on_operational_error(
            raises_value_error,
            sleep_fn=lambda _seconds: None,
        )


def test_retry_succeeds_immediately_without_sleeping():
    sleeps: list[float] = []

    result = retry_on_operational_error(
        lambda: "ok",
        sleep_fn=sleeps.append,
    )

    assert result == "ok"
    assert sleeps == []
