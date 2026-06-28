from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user_table_permission import (
    UserTablePermissionCreate,
    UserTablePermissionResponse,
)
from app.services.user_table_permission_service import (
    UserTablePermissionService,
)

router = APIRouter(
    prefix="/user-table-permissions",
    tags=["User Table Permissions"],
)


@router.get("/", response_model=list[UserTablePermissionResponse])
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return UserTablePermissionService(db).list_permissions()


@router.post(
    "/",
    response_model=UserTablePermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_permission(
    data: UserTablePermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return UserTablePermissionService(db).create_permission(data)


@router.delete("/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    UserTablePermissionService(db).delete_permission(permission_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)