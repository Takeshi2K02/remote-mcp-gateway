import contextlib
import logging
from collections.abc import AsyncIterator
from fastapi import FastAPI
from app.mcp.transport.http import session_manager

logger = logging.getLogger("app.mcp.lifespan")


@contextlib.asynccontextmanager
async def mcp_lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Initializing MCP Streamable HTTP lifespan...")
    try:
        from alembic.config import Config
        from alembic import command
        import os
        logger.info("Running database migrations programmatically on startup...")
        config_path = os.path.join(os.getcwd(), "alembic.ini")
        if os.path.exists(config_path):
            alembic_cfg = Config(config_path)
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations completed successfully.")
        else:
            logger.warning(f"alembic.ini not found at {config_path}, skipping automatic migrations.")
    except Exception as e:
        logger.error(f"Error running database migrations: {e}")

    # Reset the has_started flag to allow re-entry in test suites or reloads
    session_manager._has_started = False
    async with session_manager.run():
        logger.info("MCP Streamable HTTP transport is running.")
        yield
    logger.info("MCP Streamable HTTP transport has stopped.")
