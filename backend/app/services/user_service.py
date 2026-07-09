from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_event_service import UserEventService


class UserService:
    def __init__(self, db: Session):
        self.repository = UserRepository(db)
        self.user_event_service = UserEventService(db)

    def list_users(self) -> list[UserResponse]:
        users = self.repository.list_all()
        permitted_ids = self.repository.get_user_ids_with_any_permission()
        return [self._to_response(user, user.id in permitted_ids) for user in users]

    def get_user_by_id(self, user_id: int) -> UserResponse:
        user = self._get_user_or_404(user_id)
        return self._to_response(user, self.repository.has_permissions(user_id))

    def update_user(self, user_id: int, data: UserUpdate) -> UserResponse:
        user = self._get_user_or_404(user_id)
        updated = self.repository.update(user, data)
        return self._to_response(updated, self.repository.has_permissions(user_id))

    def get_or_provision(
        self,
        entra_object_id: str,
        email: str,
        full_name: str | None,
    ) -> tuple[User, bool]:
        """
        Find, refresh, or create a user by Entra object ID.

        This is the single shared implementation behind JIT auto-provisioning,
        used by /auth/callback (the primary provisioning point) as well as
        get_current_user and MCPAuthMiddleware (defense-in-depth backstops
        for a valid app JWT whose user row is somehow missing).

        Always syncs email/full_name to the latest token claims for existing
        users — this matches the behavior /auth/callback always had, now
        applied consistently everywhere instead of only on browser login.

        Does NOT enforce is_active: provisioning is identity resolution
        only. Callers remain responsible for their own authorization checks,
        consistent with provisioning running after token validation but
        before any permission check.

        Returns (user, created).
        """
        user = self.repository.get_by_entra_object_id(entra_object_id)

        if user:
            if user.email != email or user.full_name != full_name:
                user = self.repository.sync_profile(user, email, full_name)
            return user, False

        user = self.repository.create(entra_object_id, email, full_name)
        self.user_event_service.record_user_provisioned(user)
        return user, True

    def record_login(self, user: User) -> None:
        """
        Records a successful login: updates last_login_at every time, and
        records a first_login identity event exactly once per user.
        """
        self.repository.update_last_login(user)
        self.user_event_service.record_first_login_if_new(user)

    def _get_user_or_404(self, user_id: int) -> User:
        user = self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    @staticmethod
    def _to_response(user: User, has_permissions: bool) -> UserResponse:
        response = UserResponse.model_validate(user)
        response.has_permissions = has_permissions
        return response
