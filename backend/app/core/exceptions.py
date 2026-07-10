import logging
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for exceptions that escape route handlers. Ensures
    callers always get a structured body with a correlation ID instead of
    FastAPI's bare default 500, and logs the full traceback server-side
    so the correlation ID can be matched back to it.
    """
    correlation_id = str(uuid.uuid4())
    logger.exception(
        "Unhandled exception processing %s %s [correlation_id=%s]",
        request.method,
        request.url.path,
        correlation_id,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": (
                "An unexpected error occurred. Please try again; if the "
                "problem persists, contact support with the correlation ID."
            ),
            "correlation_id": correlation_id,
        },
    )
