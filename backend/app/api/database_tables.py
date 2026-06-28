from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.database_table import (
    DatabaseTableCreate,
    DatabaseTableResponse,
    DatabaseTableUpdate,
)
from app.services.database_table_service import DatabaseTableService

router = APIRouter(
    prefix="/database-tables",
    tags=["Database Tables"],
)


@router.get("/", response_model=list[DatabaseTableResponse])
def list_tables(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DatabaseTableService(db).list_tables()


@router.get("/{table_id}", response_model=DatabaseTableResponse)
def get_table(
    table_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DatabaseTableService(db).get_table(table_id)


@router.post(
    "/",
    response_model=DatabaseTableResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_table(
    data: DatabaseTableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DatabaseTableService(db).create_table(data)


@router.patch("/{table_id}", response_model=DatabaseTableResponse)
def update_table(
    table_id: int,
    data: DatabaseTableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DatabaseTableService(db).update_table(table_id, data)


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    DatabaseTableService(db).delete_table(table_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)