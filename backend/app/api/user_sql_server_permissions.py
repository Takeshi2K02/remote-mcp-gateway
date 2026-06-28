from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user_sql_server_permission import (
    UserSQLServerPermissionCreate,
    UserSQLServerPermissionResponse,
)
from app.services.user_sql_server_permission_service import (
    UserSQLServerPermissionService,
)

router = APIRouter(
    prefix="/user-sql-server-permissions",
    tags=["User SQL Server Permissions"],
)


@router.get("/", response_model=list[UserSQLServerPermissionResponse])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserSQLServerPermissionService(db)
    return service.list_permissions()


@router.post(
    "/",
    response_model=UserSQLServerPermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_permission(
    data: UserSQLServerPermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserSQLServerPermissionService(db)
    return service.create_permission(data)


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserSQLServerPermissionService(db)
    service.delete_permission(permission_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)