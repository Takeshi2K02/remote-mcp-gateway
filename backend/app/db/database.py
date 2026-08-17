from urllib.parse import quote_plus
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import get_settings
from app.core.retry import retry_on_operational_error

settings = get_settings()

# The metadata database runs on Azure SQL's serverless Free Limit tier
# (useFreeLimit=true, autoPauseDelay=60), which cannot be taken off
# auto-pause. After an idle hour it pauses, and the resume triggered by the
# next connection routinely outlasts ODBC Driver 18's 15 second default
# login timeout, surfacing as pyodbc.OperationalError HYT00 "Login timeout
# expired (0) (SQLDriverConnect)".
#
# 30s lets a single attempt cover a typical resume; CONNECT_ATTEMPTS then
# covers a slow one. Worst case before giving up is roughly
# 3*30s + 2s + 4s = 96s, so the gunicorn worker timeout must exceed it.
LOGIN_TIMEOUT_SECONDS = 30
CONNECT_ATTEMPTS = 3

connection_url = (
    f"mssql+pyodbc://{settings.db_username}:{quote_plus(settings.db_password)}"
    f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
    f"?driver={quote_plus(settings.db_driver)}"
    "&Encrypt=yes"
    "&TrustServerCertificate=no"
)

engine = create_engine(
    connection_url,
    pool_pre_ping=True,
    connect_args={"timeout": LOGIN_TIMEOUT_SECONDS},
)


def connect_with_resume_retry(dialect, conn_rec, cargs, cparams):
    """
    Establish a DBAPI connection, retrying through a serverless resume.

    Registered as the engine's `do_connect` hook so that every consumer of
    this engine inherits the tolerance. retry_on_operational_error was
    previously applied at individual call sites, which left any path that
    nobody had thought to wrap — /auth/callback among them — failing on the
    first login timeout.

    Only pyodbc's OperationalError is retried. Permanent faults such as a
    rejected login raise InterfaceError/ProgrammingError and propagate
    immediately rather than burning the retry budget.
    """
    return retry_on_operational_error(
        lambda: dialect.loaded_dbapi.connect(*cargs, **cparams),
        attempts=CONNECT_ATTEMPTS,
        retry_on=(dialect.loaded_dbapi.OperationalError,),
    )


event.listen(engine, "do_connect", connect_with_resume_retry)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()