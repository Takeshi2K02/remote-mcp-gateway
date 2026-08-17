"""
Central logging configuration.

Without this, the application has no logging configuration at all: the root
logger has no handlers, so Python falls back to `logging.lastResort`, which
only emits WARNING and above and formats records as a bare message with no
timestamp, level, or logger name. That means every `logger.info(...)` in the
codebase is silently dropped, and the records that do get through arrive
context-free — which is exactly what makes a production 500 take several
round-trips to diagnose.

`configure_logging()` attaches a single stdout handler to the root logger.
App Service Linux captures the container's stdout/stderr into
/home/LogFiles/*_default_docker.log, so one stream is all that is needed;
adding file handlers here would only fight with that.
"""

import logging
import os
import sys
from logging.config import dictConfig

# Level is read straight from the environment rather than from Settings on
# purpose: logging must be configurable without depending on Settings having
# validated successfully, so that a configuration error is itself reportable
# through the normal log format.
DEFAULT_LEVEL = "INFO"

_configured = False


def _resolve_level() -> str:
    level = os.environ.get("LOG_LEVEL", DEFAULT_LEVEL).upper()
    if level not in logging.getLevelNamesMapping():
        return DEFAULT_LEVEL
    return level


def configure_logging(force: bool = False) -> None:
    """
    Install the application-wide logging configuration.

    Idempotent: safe to call from multiple entry points (app import, Alembic
    env, scripts) and from every gunicorn worker. Pass force=True to
    reconfigure deliberately, e.g. from a test that needs a known state.
    """
    global _configured
    if _configured and not force:
        return

    level = _resolve_level()

    dictConfig(
        {
            "version": 1,
            # Loggers are created at module import time all over the app
            # (app.core.exceptions, app.core.retry, app.services.*), and
            # those imports happen before this runs. Disabling them here
            # would silence precisely the loggers we are trying to fix.
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": (
                        "%(asctime)s %(levelname)-8s %(name)s "
                        "[%(process)d] %(message)s"
                    ),
                    "datefmt": "%Y-%m-%dT%H:%M:%S%z",
                },
            },
            "handlers": {
                "stdout": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "stream": sys.stdout,
                },
            },
            "root": {
                "level": level,
                "handlers": ["stdout"],
            },
            # uvicorn and gunicorn install their own handlers with their own
            # formats. Clearing those and letting the records propagate to
            # root keeps every line in the container log in one format, so
            # application errors and server errors can be read together.
            "loggers": {
                name: {"handlers": [], "propagate": True, "level": level}
                for name in (
                    "uvicorn",
                    "uvicorn.error",
                    "uvicorn.access",
                    "gunicorn",
                    "gunicorn.error",
                    "gunicorn.access",
                )
            },
        }
    )

    _configured = True
