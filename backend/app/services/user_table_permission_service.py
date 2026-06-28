from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.database_table_repository import DatabaseTableRepository
from app.repositories.user_table_permission_repository import (
    UserTablePermissionRepository,
)
from app.schemas.user_table_permission import UserTablePermissionCreate


class UserTablePermissionService:
    def __init__(self, db: Session):
        self.repository = UserTablePermissionRepository(db)
        self.table_repository = DatabaseTableRepository(db)

    def list_permissions(self):
        return self.repository.list_all()

    def create_permission(self, data: UserTablePermissionCreate):
        table = self.table_repository.get_by_id(data.table_id)

        if not table:
            raise HTTPException(404, "Table not found")

        existing = self.repository.get_by_user_and_table(
            data.user_id,
            data.table_id,
        )

        if existing:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Permission already exists",
            )

        return self.repository.create(data)

    def delete_permission(self, permission_id: int):
        permission = self.repository.get_by_id(permission_id)

        if not permission:
            raise HTTPException(404, "Permission not found")

        self.repository.delete(permission)