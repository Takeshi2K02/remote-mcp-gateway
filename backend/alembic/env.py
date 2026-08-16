from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context
import app.models
from app.db.database import Base, connection_url

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# NOTE: Do NOT pass connection_url through config.set_main_option — the URL
# contains percent-encoded characters (e.g. %40) that configparser mistakes
# for interpolation tokens, raising a ValueError. We inject the URL directly
# into the engine instead (see run_migrations_online below).

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

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
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
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

    Build the engine directly from connection_url (a plain string) rather than
    routing it through Alembic's config.set_main_option / engine_from_config,
    which would pass it through configparser and misinterpret percent-encoded
    characters in the password as interpolation tokens.
    """
    connectable = create_engine(connection_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
