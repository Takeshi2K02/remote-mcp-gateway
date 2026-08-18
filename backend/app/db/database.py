from urllib.parse import quote_plus
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import get_settings
from app.core.retry import is_transient_database_error, retry_on_operational_error

settings = get_settings()

# The metadata database runs on Azure SQL's serverless Free Limit tier
# (useFreeLimit=true, autoPauseDelay=60), which cannot be taken off
# auto-pause. A connection arriving while it is paused fails one of two
# ways, and both have been seen in production:
#
#   HYT00 "Login timeout expired (0) (SQLDriverConnect)" - the resume
#     outlasts ODBC Driver 18's 15 second default login timeout.
#   HY000 ... "(40613) (SQLDriverConnect)" - the database is mid-resume and
#     actively rejects the connection with "Database is not currently
#     available. Please retry the connection later."
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

    Catching by exception type alone is not enough here. A login timeout
    arrives as pyodbc.OperationalError, but a 40613 resume rejection arrives
    as the base pyodbc.Error - and Error is the parent of OperationalError,
    not a subclass of it, so an except clause naming OperationalError never
    sees it. That gap let every 40613 through untouched.

    So the type filter is widened to pyodbc.Error and the discrimination is
    moved to is_transient_database_error, which matches on SQLSTATE and the
    native Azure SQL code. Permanent faults such as a rejected login (18456)
    are not in that set and still propagate on the first attempt.
    """
    return retry_on_operational_error(
        lambda: dialect.loaded_dbapi.connect(*cargs, **cparams),
        attempts=CONNECT_ATTEMPTS,
        retry_on=(dialect.loaded_dbapi.Error,),
        should_retry=is_transient_database_error,
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