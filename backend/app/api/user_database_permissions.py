from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.user_database_permission import (
    UserDatabasePermissionCreate,
    UserDatabasePermissionResponse,
)
from app.services.user_database_permission_service import (
    UserDatabasePermissionService,
)

router = APIRouter(
    prefix="/user-database-permissions",
    tags=["User Database Permissions"],
)


@router.get("/", response_model=list[UserDatabasePermissionResponse])
def list_user_database_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ):
    service = UserDatabasePermissionService(db)
    return service.list_permissions()


@router.get(
    "/{permission_id}",
    response_model=UserDatabasePermissionResponse,
)
def get_user_database_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = UserDatabasePermissionService(db)
    return service.get_permission(permission_id)


@router.post(
    "/",
    response_model=UserDatabasePermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user_database_permission(
    data: UserDatabasePermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = UserDatabasePermissionService(db)
    return service.create_permission(data)


@router.delete(
    "/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_user_database_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = UserDatabasePermissionService(db)
    service.delete_permission(permission_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)