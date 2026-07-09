import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.database import Database
from app.models.sql_server import SQLServer
from app.models.user import User
from app.models.user_database_permission import UserDatabasePermission
from app.repositories.database_repository import DatabaseRepository

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_list_all_returns_databases_with_no_permission_grants(db_session):
    """
    Regression test: the admin Databases page must show every registered
    database, not just ones the currently-logged-in admin happens to have
    been explicitly granted access to. A newly-synced database with zero
    UserDatabasePermission rows (nobody has been granted it yet) must still
    appear.
    """
    admin = User(id=1, entra_object_id="oid-admin", email="admin@example.com", is_active=True)
    other_user = User(id=2, entra_object_id="oid-2", email="user2@example.com", is_active=True)
    sql_server = SQLServer(id=1, name="Server A", host="a.database.windows.net")
    granted_db = Database(id=1, sql_server_id=1, name="GrantedDB")
    ungranted_db = Database(id=2, sql_server_id=1, name="MeridianRetailDW")
    db_session.add_all([admin, other_user, sql_server, granted_db, ungranted_db])
    db_session.commit()

    # Only "other_user" has been granted the first database — nobody has
    # been granted the second (newly-synced) one at all.
    db_session.add(UserDatabasePermission(user_id=other_user.id, database_id=granted_db.id))
    db_session.commit()

    repo = DatabaseRepository(db_session)
    result = repo.list_all()

    names = {db.name for db in result}
    assert names == {"GrantedDB", "MeridianRetailDW"}
