import logging
import time
from typing import Callable, TypeVar

from sqlalchemy.exc import OperationalError

logger = logging.getLogger(__name__)

T = TypeVar("T")


def retry_on_operational_error(
    func: Callable[[], T],
    *,
    attempts: int = 5,
    initial_backoff_seconds: float = 2.0,
    sleep_fn: Callable[[float], None] | None = None,
) -> T:
    """
    Retry a metadata-DB call with exponential backoff on OperationalError.

    The gateway's metadata database runs on Azure SQL's serverless Free
    Limit tier, which cannot be taken off auto-pause. The first connection
    after an idle period can take up to ~30s while the database resumes,
    and fails with a login timeout if attempted too early. Defaults give a
    cumulative retry budget of ~30s (2+4+8+16) to cover that resume window.
    """
    sleep = sleep_fn or time.sleep
    backoff_seconds = initial_backoff_seconds
    for attempt in range(1, attempts + 1):
        try:
            return func()
        except OperationalError as exc:
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
