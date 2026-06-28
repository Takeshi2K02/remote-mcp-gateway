from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.database_repository import DatabaseRepository
from app.repositories.user_database_permission_repository import (
    UserDatabasePermissionRepository,
)
from app.schemas.user_database_permission import UserDatabasePermissionCreate


class UserDatabasePermissionService:
    def __init__(self, db: Session):
        self.repository = UserDatabasePermissionRepository(db)
        self.database_repository = DatabaseRepository(db)

    def list_permissions(self):
        return self.repository.list_all()

    def get_permission(self, permission_id: int):
        permission = self.repository.get_by_id(permission_id)

        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission not found",
            )

        return permission

    def create_permission(self, data: UserDatabasePermissionCreate):
        database = self.database_repository.get_by_id(data.database_id)

        if not database:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Database not found",
            )

        existing = self.repository.get_by_user_and_database(
            data.user_id,
            data.database_id,
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has permission for this database",
            )

        return self.repository.create(data)

    def delete_permission(self, permission_id: int):
        permission = self.get_permission(permission_id)
        self.repository.delete(permission)