from logging.config import fileConfig
from sqlalchemy import create_engine
from sqlalchemy.exc import DBAPIError
from sqlalchemy import pool
from alembic import context
import app.models  # noqa: F401 - registers all models on Base.metadata for autogenerate
from app.core.retry import is_transient_database_error, retry_on_operational_error
from app.db.database import Base, connection_url

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# NOTE: Do NOT pass connection_url through config.set_main_option — the URL
# contains percent-encoded characters (e.g. %40 for @ in the password) that
# configparser mistakes for interpolation tokens, raising an
# InterpolationSyntaxError before any migration runs. The URL is injected
# directly into the engine instead (see run_migrations_online below), and
# read straight from the module in offline mode.

# Interpret the config file for Python logging.
# This line sets up loggers basically. Skipped when migrations run
# in-process (e.g. app startup), since it would otherwise clobber the
# app's own logging config (disabling loggers and forcing root to WARNING).
if config.config_file_name is not None and config.attributes.get(
    "configure_logger", True
):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Read from the module rather than config.get_main_option: with
    # set_main_option removed (see above), "sqlalchemy.url" is unset in the
    # .ini and would come back None.
    context.configure(
        url=connection_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    Build the engine directly from connection_url (a plain string) rather
    than routing it through Alembic's config.set_main_option /
    engine_from_config, which would pass it through configparser and
    misinterpret percent-encoded characters in the password as interpolation
    tokens.
    """
    connectable = create_engine(connection_url, poolclass=pool.NullPool)

    # The metadata DB runs on Azure SQL's serverless Free Limit tier, which
    # cannot be taken off auto-pause. Retry the initial connect so a resume
    # doesn't fail the whole migration job.
    #
    # This engine is built here rather than shared with app.db.database, so
    # it does not carry that engine's do_connect hook and needs the same
    # widening applied explicitly. A resume rejection (40613) reaches this
    # layer wrapped as sqlalchemy.exc.DBAPIError, which is the parent of
    # OperationalError rather than a subclass, so the default retry_on would
    # not match it.
    connection = retry_on_operational_error(
        connectable.connect,
        retry_on=(DBAPIError,),
        should_retry=is_transient_database_error,
    )
    with connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
