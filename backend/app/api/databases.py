from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.database import (
    DatabaseCreate,
    DatabaseResponse,
    DatabaseUpdate,
)
from app.schemas.sync import SyncResponse
from app.services.database_service import DatabaseService
from app.services.sql_server_discovery_service import SQLServerDiscoveryService
from app.auth.authorization import require_database_access

router = APIRouter(prefix="/databases", tags=["Databases"])


@router.get("/", response_model=list[DatabaseResponse])
def list_databases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)   
    ):
    service = DatabaseService(db)
    return service.list_databases(current_user)


@router.get("/{database_id}", response_model=DatabaseResponse)
def get_database(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_database_access(
        db=db,
        current_user=current_user,
        database_id=database_id,
    )

    service = DatabaseService(db)
    return service.get_database(database_id)


@router.post(
    "/",
    response_model=DatabaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_database(
    data: DatabaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)   
):
    service = DatabaseService(db)
    return service.create_database(data)


@router.patch("/{database_id}", response_model=DatabaseResponse)
def update_database(
    database_id: int,
    data: DatabaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)   
):
    require_database_access(
        db=db,
        current_user=current_user,
        database_id=database_id,
    )

    service = DatabaseService(db)
    return service.update_database(database_id, data)


@router.delete(
    "/{database_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_database(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)   
):
    require_database_access(
        db=db,
        current_user=current_user,
        database_id=database_id,
    )
    
    service = DatabaseService(db)
    service.delete_database(database_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{database_id}/sync",
    response_model=SyncResponse,
    summary="Sync tables for a database",
    description=(
        "Connects to the database and discovers all base tables, storing "
        "them in the gateway. Safe to call repeatedly — uses upsert semantics."
    ),
)
def sync_database_tables(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    discovery = SQLServerDiscoveryService(db)
    return discovery.sync_tables(database_id)