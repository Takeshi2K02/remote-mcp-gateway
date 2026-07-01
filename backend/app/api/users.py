from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.permission_tree import ServerNode, PermissionSyncRequest
from app.services.user_service import UserService
from app.services.permission_tree_service import PermissionTreeService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserService(db)
    return service.list_users()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserService(db)
    return service.get_user_by_id(user_id)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UserService(db)
    return service.update_user(user_id, data)


@router.get("/{user_id}/permission-tree", response_model=list[ServerNode])
def get_permission_tree(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PermissionTreeService(db)
    return service.get_permission_tree(user_id)


@router.put("/{user_id}/permissions", status_code=status.HTTP_204_NO_CONTENT)
def sync_permissions(
    user_id: int,
    request: PermissionSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PermissionTreeService(db)
    service.sync_permissions(user_id, request.changes)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
