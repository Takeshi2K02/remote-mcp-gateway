import contextlib
import logging
import os
from collections.abc import AsyncIterator
from fastapi import FastAPI
from app.core.config import get_settings
from app.mcp.transport.http import session_manager

logger = logging.getLogger("app.mcp.lifespan")


@contextlib.asynccontextmanager
async def mcp_lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("Initializing MCP Streamable HTTP lifespan...")

    if get_settings().auto_migrate_on_startup:
        from alembic.config import Config
        from alembic import command

        logger.info("AUTO_MIGRATE_ON_STARTUP is enabled - running database migrations...")
        config_path = os.path.join(os.getcwd(), "alembic.ini")
        if os.path.exists(config_path):
            alembic_cfg = Config(config_path)
            alembic_cfg.attributes["configure_logger"] = False
            # Deliberately not caught: in production migrations run as
            # their own gated CI/CD step (this flag is dev-only), and a
            # migration failure here means the schema and app code are out
            # of sync - starting up anyway would serve traffic against a
            # partially-migrated schema, which is worse than not starting.
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations completed successfully.")
        else:
            raise RuntimeError(
                f"AUTO_MIGRATE_ON_STARTUP is enabled but alembic.ini was not found at {config_path}."
            )

    # Reset the has_started flag to allow re-entry in test suites or reloads
    session_manager._has_started = False
    async with session_manager.run():
        logger.info("MCP Streamable HTTP transport is running.")
        yield
    logger.info("MCP Streamable HTTP transport has stopped.")
