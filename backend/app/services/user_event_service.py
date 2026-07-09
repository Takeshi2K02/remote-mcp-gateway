import logging
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.user_event_repository import UserEventRepository
from app.schemas.user_event import UserEventCreate

logger = logging.getLogger(__name__)

EVENT_USER_PROVISIONED = "user_provisioned"
EVENT_FIRST_LOGIN = "first_login"


class UserEventService:
    """
    Records identity lifecycle events (provisioning, first login, ...).

    Failures here are logged and swallowed rather than propagated, since an
    identity-event write must never block authentication or provisioning —
    the same defensive pattern AuditLogService uses for data-access events.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = UserEventRepository(db)

    def record_user_provisioned(self, user: User) -> None:
        self._record(
            user_id=user.id,
            event_type=EVENT_USER_PROVISIONED,
            details=f"Provisioned via JIT auto-provisioning for {user.email}",
        )

    def record_first_login_if_new(self, user: User) -> None:
        """
        Records a `first_login` event exactly once per user — the first
        time this is called for a given user_id, regardless of whether the
        row was just created (JIT) or already existed.
        """
        try:
            if self.repository.exists_for_user(user.id, EVENT_FIRST_LOGIN):
                return
        except Exception:
            logger.exception(
                "Failed to check first_login event for user %d", user.id
            )
            return

        self._record(
            user_id=user.id,
            event_type=EVENT_FIRST_LOGIN,
            details=f"First successful login for {user.email}",
        )

    def _record(self, user_id: int, event_type: str, details: str | None) -> None:
        try:
            self.repository.create(
                UserEventCreate(
                    user_id=user_id,
                    event_type=event_type,
                    details=details,
                )
            )
        except Exception:
            logger.exception(
                "Failed to persist user event '%s' for user %d",
                event_type,
                user_id,
            )
