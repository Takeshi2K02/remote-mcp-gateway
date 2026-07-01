from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.oauth_client import (
    OAuthClientCreate,
    OAuthClientUpdate,
    OAuthClientResponse,
    OAuthClientCreateResponse,
)
from app.services.oauth_client_service import OAuthClientService

router = APIRouter(prefix="/oauth-clients", tags=["OAuth Clients"])


@router.get("/", response_model=list[OAuthClientResponse])
def list_oauth_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = OAuthClientService(db)
    return service.list_clients()


@router.get("/{client_id}", response_model=OAuthClientResponse)
def get_oauth_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = OAuthClientService(db)
    return service.get_client(client_id)


@router.post(
    "/",
    response_model=OAuthClientCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_oauth_client(
    data: OAuthClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = OAuthClientService(db)
    db_client, raw_secret = service.create_client(data)
    
    # Map model to response schema and include raw client_secret
    response = OAuthClientCreateResponse.model_validate(db_client)
    response.client_secret = raw_secret
    return response


@router.patch("/{client_id}", response_model=OAuthClientResponse)
def update_oauth_client(
    client_id: int,
    data: OAuthClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = OAuthClientService(db)
    return service.update_client(client_id, data)


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_oauth_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = OAuthClientService(db)
    service.delete_client(client_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
