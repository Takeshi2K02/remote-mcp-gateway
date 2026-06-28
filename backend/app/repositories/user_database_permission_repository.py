from sqlalchemy.orm import Session
from app.models.user_database_permission import UserDatabasePermission
from app.schemas.user_database_permission import UserDatabasePermissionCreate


class UserDatabasePermissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, permission_id: int) -> UserDatabasePermission | None:
        return (
            self.db.query(UserDatabasePermission)
            .filter(UserDatabasePermission.id == permission_id)
            .first()
        )

    def get_by_user_and_database(
        self,
        user_id: int,
        database_id: int,
    ) -> UserDatabasePermission | None:
        return (
            self.db.query(UserDatabasePermission)
            .filter(
                UserDatabasePermission.user_id == user_id,
                UserDatabasePermission.database_id == database_id,
            )
            .first()
        )

    def list_all(self) -> list[UserDatabasePermission]:
        return (
            self.db.query(UserDatabasePermission)
            .order_by(UserDatabasePermission.created_at.desc())
            .all()
        )

    def create(
        self,
        data: UserDatabasePermissionCreate,
    ) -> UserDatabasePermission:
        permission = UserDatabasePermission(**data.model_dump())

        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)

        return permission

    def delete(self, permission: UserDatabasePermission) -> None:
        self.db.delete(permission)
        self.db.commit()