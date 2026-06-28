from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.sql_server_repository import SQLServerRepository
from app.repositories.user_sql_server_permission_repository import (
    UserSQLServerPermissionRepository,
)
from app.schemas.user_sql_server_permission import UserSQLServerPermissionCreate


class UserSQLServerPermissionService:
    def __init__(self, db: Session):
        self.repository = UserSQLServerPermissionRepository(db)
        self.sql_server_repository = SQLServerRepository(db)

    def list_permissions(self):
        return self.repository.list_all()

    def create_permission(self, data: UserSQLServerPermissionCreate):
        sql_server = self.sql_server_repository.get_by_id(data.sql_server_id)

        if not sql_server:
            raise HTTPException(status_code=404, detail="SQL server not found")

        existing = self.repository.get_by_user_and_server(
            data.user_id,
            data.sql_server_id,
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has permission for this SQL server",
            )

        return self.repository.create(data)

    def delete_permission(self, permission_id: int):
        permission = self.repository.get_by_id(permission_id)

        if not permission:
            raise HTTPException(status_code=404, detail="Permission not found")

        self.repository.delete(permission)