import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.database import Database
from app.models.database_table import DatabaseTable
from app.models.sql_server import SQLServer
from app.models.user import User
from app.models.user_database_permission import UserDatabasePermission
from app.models.user_sql_server_permission import UserSQLServerPermission
from app.models.user_table_permission import UserTablePermission
from app.schemas.permission_tree import PermissionChange
from app.services.permission_tree_service import PermissionTreeService

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # autoflush=False matches the production SessionLocal configuration in
    # app/db/database.py — the duplicate-insert bug only reproduces under
    # this exact setting.
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    user = User(id=2, entra_object_id="oid-2", email="user2@example.com", is_active=True)
    sql_server = SQLServer(id=3, name="MeridianRetailDW - SEA Prod", host="sql-meridian.database.windows.net")
    database = Database(id=3, sql_server_id=3, name="MeridianRetailDW")
    db.add_all([user, sql_server, database])
    db.commit()

    tables = [
        DatabaseTable(id=100 + i, database_id=3, schema_name="dbo", table_name=f"Table{i}")
        for i in range(10)
    ]
    db.add_all(tables)
    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_sync_permissions_grants_database_and_cascaded_tables_in_one_call(db_session):
    """
    Regression test: checking a database's checkbox in the admin UI cascades
    to checking all of its child tables client-side, so a single Save sends
    one level="database" change plus one level="table" change per table.
    On a brand-new grant (no pre-existing permission rows), this used to
    raise a UniqueConstraint IntegrityError because each change re-queried
    for the "parent permission exists" check without seeing sibling changes'
    unflushed inserts in the same request.
    """
    service = PermissionTreeService(db_session)
    table_ids = [
        row.id
        for row in db_session.query(DatabaseTable).filter(DatabaseTable.database_id == 3).all()
    ]

    changes = [PermissionChange(level="database", resource_id=3, grant=True)]
    changes += [PermissionChange(level="table", resource_id=tid, grant=True) for tid in table_ids]

    service.sync_permissions(2, changes)

    server_perms = db_session.query(UserSQLServerPermission).filter(
        UserSQLServerPermission.user_id == 2
    ).all()
    db_perms = db_session.query(UserDatabasePermission).filter(
        UserDatabasePermission.user_id == 2
    ).all()
    table_perms = db_session.query(UserTablePermission).filter(
        UserTablePermission.user_id == 2
    ).all()

    assert len(server_perms) == 1
    assert len(db_perms) == 1
    assert len(table_perms) == 10


def test_sync_permissions_is_idempotent_when_called_twice(db_session):
    service = PermissionTreeService(db_session)
    changes = [PermissionChange(level="database", resource_id=3, grant=True)]

    service.sync_permissions(2, changes)
    service.sync_permissions(2, changes)

    db_perms = db_session.query(UserDatabasePermission).filter(
        UserDatabasePermission.user_id == 2
    ).all()
    assert len(db_perms) == 1


def test_sync_permissions_grant_database_raises_404_for_unknown_database(db_session):
    service = PermissionTreeService(db_session)
    changes = [PermissionChange(level="database", resource_id=9999, grant=True)]

    with pytest.raises(HTTPException) as exc_info:
        service.sync_permissions(2, changes)

    assert exc_info.value.status_code == 404
    assert "9999" in exc_info.value.detail


def test_sync_permissions_grant_table_raises_404_for_unknown_table(db_session):
    service = PermissionTreeService(db_session)
    changes = [PermissionChange(level="table", resource_id=9999, grant=True)]

    with pytest.raises(HTTPException) as exc_info:
        service.sync_permissions(2, changes)

    assert exc_info.value.status_code == 404
    assert "9999" in exc_info.value.detail


def test_sync_permissions_revoke_database_cascades_to_tables(db_session):
    service = PermissionTreeService(db_session)
    table_ids = [
        row.id
        for row in db_session.query(DatabaseTable).filter(DatabaseTable.database_id == 3).all()
    ]
    grant_changes = [PermissionChange(level="database", resource_id=3, grant=True)]
    grant_changes += [PermissionChange(level="table", resource_id=tid, grant=True) for tid in table_ids]
    service.sync_permissions(2, grant_changes)

    service.sync_permissions(2, [PermissionChange(level="database", resource_id=3, grant=False)])

    assert db_session.query(UserDatabasePermission).filter(
        UserDatabasePermission.user_id == 2
    ).count() == 0
    assert db_session.query(UserTablePermission).filter(
        UserTablePermission.user_id == 2
    ).count() == 0
