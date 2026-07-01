import contextlib
import logging
from collections.abc import AsyncIterator
from fastapi import FastAPI
from app.mcp.transport.http import session_manager

logger = logging.getLogger("app.mcp.lifespan")


@contextlib.asynccontextmanager
async def mcp_lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Initializing MCP Streamable HTTP lifespan...")
    # Reset the has_started flag to allow re-entry in test suites or reloads
    session_manager._has_started = False
    async with session_manager.run():
        logger.info("MCP Streamable HTTP transport is running.")
        yield
    logger.info("MCP Streamable HTTP transport has stopped.")
