from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.db.database import get_db
from app.schemas.sql_server import (
    SQLServerCreate,
    SQLServerResponse,
    SQLServerUpdate,
)
from app.services.sql_server_service import SQLServerService

router = APIRouter(prefix="/sql-servers", tags=["SQL Servers"])


@router.get("/", response_model=list[SQLServerResponse])
def list_sql_servers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)       
):
    service = SQLServerService(db)
    return service.list_sql_servers()


@router.get("/{sql_server_id}", response_model=SQLServerResponse)
def get_sql_server(
    sql_server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = SQLServerService(db)
    return service.get_sql_server(sql_server_id)


@router.post(
    "/",
    response_model=SQLServerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sql_server(
    data: SQLServerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = SQLServerService(db)
    return service.create_sql_server(data)


@router.patch("/{sql_server_id}", response_model=SQLServerResponse)
def update_sql_server(
    sql_server_id: int,
    data: SQLServerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = SQLServerService(db)
    return service.update_sql_server(sql_server_id, data)


@router.delete(
    "/{sql_server_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_sql_server(
    sql_server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = SQLServerService(db)
    service.delete_sql_server(sql_server_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)