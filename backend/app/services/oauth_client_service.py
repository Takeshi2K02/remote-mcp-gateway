import hashlib
import secrets
from urllib.parse import urlparse
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.oauth_client_repository import OAuthClientRepository
from app.schemas.oauth_client import OAuthClientCreate, OAuthClientUpdate
from app.models.oauth_client import OAuthClient


class OAuthClientService:
    def __init__(self, db: Session):
        self.repository = OAuthClientRepository(db)

    def list_clients(self) -> list[OAuthClient]:
        return self.repository.list_clients()

    def get_client(self, client_internal_id: int) -> OAuthClient:
        client = self.repository.get_by_id(client_internal_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OAuth client not found",
            )
        return client

    def create_client(self, data: OAuthClientCreate) -> tuple[OAuthClient, str | None]:
        # Validate client type
        if data.client_type not in ["public", "confidential"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="client_type must be either 'public' or 'confidential'",
            )

        # Validate redirect URIs
        self._validate_redirect_uris(data.redirect_uris)

        # Generate secure client_id
        client_id = f"client_{secrets.token_hex(16)}"

        # Ensure client_id is unique
        while self.repository.get_by_client_id(client_id) is not None:
            client_id = f"client_{secrets.token_hex(16)}"

        raw_secret = None
        secret_hash = None

        # Handle secret for confidential clients
        if data.client_type == "confidential":
            # Generate a secure 43-character string
            raw_secret = secrets.token_urlsafe(32)
            secret_hash = self.hash_secret(raw_secret)

        client_data = {
            "client_id": client_id,
            "client_name": data.client_name,
            "client_secret_hash": secret_hash,
            "client_type": data.client_type,
            "redirect_uris": data.redirect_uris,
            "allowed_scopes": data.allowed_scopes,
            "is_active": data.is_active,
        }

        db_client = self.repository.create(client_data)
        return db_client, raw_secret

    def update_client(self, client_internal_id: int, data: OAuthClientUpdate) -> OAuthClient:
        client = self.get_client(client_internal_id)
        update_data = data.model_dump(exclude_unset=True)

        if "client_type" in update_data and update_data["client_type"] not in ["public", "confidential"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="client_type must be either 'public' or 'confidential'",
            )

        if "redirect_uris" in update_data:
            self._validate_redirect_uris(update_data["redirect_uris"])

        # Prevent changing client_type in a way that breaks secrets
        if "client_type" in update_data and update_data["client_type"] != client.client_type:
            if update_data["client_type"] == "public":
                update_data["client_secret_hash"] = None
            elif update_data["client_type"] == "confidential" and not client.client_secret_hash:
                # If changing from public to confidential, we'd need to generate a secret.
                # However, since update_client returns the updated client and the password hash
                # is not returnable, it's safer to reject this or let them recreate.
                # Let's raise an error.
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot convert a public client to a confidential client. Please create a new client instead.",
                )

        return self.repository.update(client, update_data)

    def delete_client(self, client_internal_id: int) -> None:
        client = self.get_client(client_internal_id)
        self.repository.delete(client)

    @staticmethod
    def hash_secret(secret: str) -> str:
        """Hash client_secret using SHA-256."""
        return hashlib.sha256(secret.encode("utf-8")).hexdigest()

    def _validate_redirect_uris(self, uris: list[str]) -> None:
        """Ensure all redirect URIs are valid URLs."""
        if not uris:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one redirect URI is required.",
            )

        for uri in uris:
            parsed = urlparse(uri)
            if not parsed.scheme or not parsed.netloc:
                # Allow localhost or custom loopback IPs for native app redirect URIs without netloc checks (standard for OAuth 2.1 loopback)
                # But it must have at least a scheme.
                if not parsed.scheme:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid redirect URI: '{uri}'. Scheme is missing.",
                    )
