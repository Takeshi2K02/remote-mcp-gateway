from datetime import UTC, datetime
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.user_database_permission import UserDatabasePermission
from app.models.user_sql_server_permission import UserSQLServerPermission
from app.models.user_table_permission import UserTablePermission
from app.schemas.user import UserUpdate


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_entra_object_id(self, entra_object_id: str) -> User | None:
        return self.db.query(User).filter(User.entra_object_id == entra_object_id).first()

    def list_all(self) -> list[User]:
        return self.db.query(User).order_by(User.id.asc()).all()

    def update(self, user: User, data: UserUpdate) -> User:
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    def create(
        self,
        entra_object_id: str,
        email: str,
        full_name: str | None,
    ) -> User:
        user = User(
            entra_object_id=entra_object_id,
            email=email,
            full_name=full_name,
            is_active=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def sync_profile(
        self,
        user: User,
        email: str,
        full_name: str | None,
    ) -> User:
        user.email = email
        user.full_name = full_name
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_last_login(self, user: User) -> None:
        user.last_login_at = datetime.now(UTC)
        self.db.commit()

    def has_permissions(self, user_id: int) -> bool:
        return (
            self.db.query(UserSQLServerPermission.id)
            .filter(UserSQLServerPermission.user_id == user_id)
            .first()
            is not None
            or self.db.query(UserDatabasePermission.id)
            .filter(UserDatabasePermission.user_id == user_id)
            .first()
            is not None
            or self.db.query(UserTablePermission.id)
            .filter(UserTablePermission.user_id == user_id)
            .first()
            is not None
        )

    def get_user_ids_with_any_permission(self) -> set[int]:
        server_ids = {
            row[0]
            for row in self.db.query(UserSQLServerPermission.user_id).distinct().all()
        }
        db_ids = {
            row[0]
            for row in self.db.query(UserDatabasePermission.user_id).distinct().all()
        }
        table_ids = {
            row[0]
            for row in self.db.query(UserTablePermission.user_id).distinct().all()
        }
        return server_ids | db_ids | table_ids
