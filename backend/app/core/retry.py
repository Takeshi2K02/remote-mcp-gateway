import logging
import re
import time
from typing import Callable, TypeVar

from sqlalchemy.exc import OperationalError

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Azure SQL surfaces transient faults as a native error code embedded in the
# driver's message text, e.g. "... is not currently available. ... (40613)
# (SQLDriverConnect)". There is no structured field for it on the pyodbc
# exception, so the code is parsed back out of the message.
#
# 40613 is the one that matters for this deployment: the serverless database
# auto-pauses, and a connection arriving mid-resume is actively rejected with
# "Database is not currently available. Please retry the connection later."
# The rest are the standard Azure SQL transient set, included because they
# describe the same "try again shortly" condition and would otherwise each
# need their own incident to discover.
TRANSIENT_SQL_ERROR_CODES = frozenset(
    {
        4060,   # Cannot open database requested by the login
        10053,  # Transport-level error, connection aborted
        10054,  # Transport-level error, connection forcibly closed
        10060,  # Network-related error establishing a connection
        10928,  # Resource ID limit reached
        10929,  # Resource ID minimum guarantee unavailable
        40197,  # Service error encountered, reconfiguration in progress
        40501,  # Service is busy
        40613,  # Database is not currently available (auto-pause resume)
        49918,  # Cannot process request, not enough resources
        49919,  # Cannot process create or update request
        49920,  # Cannot process request, too many operations
    }
)

# Login and query timeouts, which is how a resume looks when the driver gives
# up waiting rather than being explicitly rejected. This is the HYT00 case the
# original version of this helper was written for.
TRANSIENT_SQLSTATES = frozenset({"HYT00", "HYT01"})

_NATIVE_CODE_PATTERN = re.compile(r"\((\d+)\)")


def is_transient_database_error(exc: BaseException) -> bool:
    """
    True when `exc` describes a condition worth retrying shortly.

    Checks the SQLSTATE first (pyodbc puts it in args[0]), then the native
    Azure SQL codes parsed out of the message. Parenthesised integers are
    extracted and matched as whole numbers rather than by substring, so a
    code cannot accidentally match inside the session tracing GUID Azure
    appends to these messages.

    Permanent faults return False: a rejected login is code 18456, absent
    from TRANSIENT_SQL_ERROR_CODES, so it surfaces immediately instead of
    burning the retry budget.
    """
    sqlstate = exc.args[0] if exc.args else None
    if isinstance(sqlstate, str) and sqlstate.upper() in TRANSIENT_SQLSTATES:
        return True

    text = str(exc)
    codes = {int(match) for match in _NATIVE_CODE_PATTERN.findall(text)}
    return bool(codes & TRANSIENT_SQL_ERROR_CODES)


def retry_on_operational_error(
    func: Callable[[], T],
    *,
    attempts: int = 5,
    initial_backoff_seconds: float = 2.0,
    sleep_fn: Callable[[float], None] | None = None,
    retry_on: tuple[type[BaseException], ...] = (OperationalError,),
    should_retry: Callable[[BaseException], bool] | None = None,
) -> T:
    """
    Retry a metadata-DB call with exponential backoff on OperationalError.

    The gateway's metadata database runs on Azure SQL's serverless Free
    Limit tier, which cannot be taken off auto-pause. The first connection
    after an idle period can take up to ~30s while the database resumes,
    and fails with a login timeout if attempted too early. Defaults give a
    cumulative retry budget of ~30s (2+4+8+16) to cover that resume window.

    `retry_on` overrides which exception types are treated as retryable. It
    exists for callers operating below SQLAlchemy's error wrapping — the
    engine's do_connect hook sees raw DBAPI exceptions, which are not
    subclasses of SQLAlchemy's.

    `should_retry` narrows a broad `retry_on` by inspecting the exception.
    The two are meant to be used together: a resume rejection arrives as the
    base pyodbc.Error rather than pyodbc.OperationalError, so catching it by
    type alone means catching every DBAPI failure including permanent ones.
    Pairing retry_on=(pyodbc.Error,) with should_retry=
    is_transient_database_error keeps the net wide enough to catch 40613 and
    narrow enough that a bad password still fails fast. Defaults to None,
    which retries anything matching `retry_on`.
    """
    sleep = sleep_fn or time.sleep
    backoff_seconds = initial_backoff_seconds
    for attempt in range(1, attempts + 1):
        try:
            return func()
        except retry_on as exc:
            if should_retry is not None and not should_retry(exc):
                raise
            if attempt == attempts:
                raise
            logger.warning(
                "Metadata DB call failed (attempt %d/%d), retrying in %.1fs: %s",
                attempt,
                attempts,
                backoff_seconds,
                exc,
            )
            sleep(backoff_seconds)
            backoff_seconds *= 2

    raise AssertionError("unreachable")
