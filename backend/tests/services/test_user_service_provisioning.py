import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.models.user_event import UserEvent
from app.services.user_event_service import EVENT_FIRST_LOGIN, EVENT_USER_PROVISIONED
from app.services.user_service import UserService

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


def test_get_or_provision_creates_new_user_and_records_event(db_session):
    service = UserService(db_session)

    user, created = service.get_or_provision(
        entra_object_id="new-oid",
        email="new-user@example.com",
        full_name="New User",
    )

    assert created is True
    assert user.id is not None
    assert user.email == "new-user@example.com"
    assert user.full_name == "New User"
    assert user.is_active is True

    events = db_session.query(UserEvent).filter(UserEvent.user_id == user.id).all()
    assert len(events) == 1
    assert events[0].event_type == EVENT_USER_PROVISIONED


def test_get_or_provision_is_idempotent_for_existing_user(db_session):
    service = UserService(db_session)

    user, created = service.get_or_provision("existing-oid", "a@example.com", "A")
    assert created is True

    user_again, created_again = service.get_or_provision(
        "existing-oid", "a@example.com", "A"
    )

    assert created_again is False
    assert user_again.id == user.id

    events = db_session.query(UserEvent).filter(UserEvent.user_id == user.id).all()
    assert len(events) == 1, "no duplicate user_provisioned event on repeat calls"


def test_get_or_provision_syncs_profile_on_existing_user(db_session):
    service = UserService(db_session)
    user, _ = service.get_or_provision("sync-oid", "old@example.com", "Old Name")

    updated_user, created = service.get_or_provision(
        "sync-oid", "new@example.com", "New Name"
    )

    assert created is False
    assert updated_user.id == user.id
    assert updated_user.email == "new@example.com"
    assert updated_user.full_name == "New Name"


def test_get_or_provision_does_not_override_is_active(db_session):
    service = UserService(db_session)
    user, _ = service.get_or_provision("inactive-oid", "x@example.com", "X")
    user.is_active = False
    db_session.commit()

    refetched, created = service.get_or_provision("inactive-oid", "x@example.com", "X")

    assert created is False
    assert refetched.is_active is False


def test_record_login_updates_last_login_and_records_first_login_once(db_session):
    service = UserService(db_session)
    user, _ = service.get_or_provision("login-oid", "login@example.com", "Login User")
    assert user.last_login_at is None

    service.record_login(user)
    db_session.refresh(user)
    first_login_time = user.last_login_at
    assert first_login_time is not None

    events = (
        db_session.query(UserEvent)
        .filter(UserEvent.user_id == user.id, UserEvent.event_type == EVENT_FIRST_LOGIN)
        .all()
    )
    assert len(events) == 1

    service.record_login(user)
    db_session.refresh(user)

    events_after_second_login = (
        db_session.query(UserEvent)
        .filter(UserEvent.user_id == user.id, UserEvent.event_type == EVENT_FIRST_LOGIN)
        .all()
    )
    assert len(events_after_second_login) == 1, "first_login must only be recorded once"
    assert user.last_login_at is not None


def test_list_users_reports_has_permissions_correctly(db_session):
    from app.models.database import Database
    from app.models.sql_server import SQLServer
    from app.models.user_database_permission import UserDatabasePermission

    service = UserService(db_session)
    granted_user, _ = service.get_or_provision("granted-oid", "granted@example.com", "Granted")
    ungranted_user, _ = service.get_or_provision(
        "ungranted-oid", "ungranted@example.com", "Ungranted"
    )

    sql_server = SQLServer(id=1, name="Server A", host="a.database.windows.net")
    database = Database(id=1, sql_server_id=1, name="DB A")
    db_session.add_all([sql_server, database])
    db_session.commit()

    db_session.add(
        UserDatabasePermission(user_id=granted_user.id, database_id=database.id)
    )
    db_session.commit()

    responses = {u.id: u for u in service.list_users()}

    assert responses[granted_user.id].has_permissions is True
    assert responses[ungranted_user.id].has_permissions is False
