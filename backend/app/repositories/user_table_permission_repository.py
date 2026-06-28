from sqlalchemy.orm import Session
from app.models.user_table_permission import UserTablePermission
from app.schemas.user_table_permission import UserTablePermissionCreate


class UserTablePermissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self):
        return self.db.query(UserTablePermission).all()

    def get_by_id(self, permission_id: int):
        return self.db.query(UserTablePermission).filter(
            UserTablePermission.id == permission_id
        ).first()

    def get_by_user_and_table(self, user_id: int, table_id: int):
        return self.db.query(UserTablePermission).filter(
            UserTablePermission.user_id == user_id,
            UserTablePermission.table_id == table_id,
        ).first()

    def create(self, data: UserTablePermissionCreate):
        permission = UserTablePermission(**data.model_dump())
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)
        return permission

    def delete(self, permission: UserTablePermission):
        self.db.delete(permission)
        self.db.commit()