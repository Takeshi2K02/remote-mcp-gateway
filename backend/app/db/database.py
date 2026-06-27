from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import get_settings

settings = get_settings()

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
)

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