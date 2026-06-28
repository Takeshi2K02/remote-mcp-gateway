from sqlalchemy.orm import Session
from app.models.user_sql_server_permission import UserSQLServerPermission
from app.schemas.user_sql_server_permission import UserSQLServerPermissionCreate


class UserSQLServerPermissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self):
        return self.db.query(UserSQLServerPermission).all()

    def get_by_id(self, permission_id: int):
        return self.db.query(UserSQLServerPermission).filter(
            UserSQLServerPermission.id == permission_id
        ).first()

    def get_by_user_and_server(self, user_id: int, sql_server_id: int):
        return self.db.query(UserSQLServerPermission).filter(
            UserSQLServerPermission.user_id == user_id,
            UserSQLServerPermission.sql_server_id == sql_server_id,
        ).first()

    def create(self, data: UserSQLServerPermissionCreate):
        permission = UserSQLServerPermission(**data.model_dump())
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)
        return permission

    def delete(self, permission: UserSQLServerPermission):
        self.db.delete(permission)
        self.db.commit()