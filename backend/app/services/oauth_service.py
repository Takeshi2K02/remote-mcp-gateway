import base64
from datetime import UTC, datetime, timedelta
from fastapi import HTTPException, status
import hashlib
import secrets
from sqlalchemy.orm import Session

from app.auth.jwt_service import create_access_token
from app.core.config import get_settings
from app.models.user import User
from app.repositories.oauth_authorization_code_repository import (
    OAuthAuthorizationCodeRepository,
)
from app.repositories.oauth_client_repository import OAuthClientRepository
from app.services.oauth_client_service import OAuthClientService

settings = get_settings()


class OAuthService:
    def __init__(self, db: Session):
        self.db = db
        self.code_repo = OAuthAuthorizationCodeRepository(db)
        self.client_repo = OAuthClientRepository(db)

    def create_authorization_code(
        self,
        client_id: str,
        user_id: int,
        redirect_uri: str,
        code_challenge: str,
        code_challenge_method: str,
        scopes: list[str],
    ) -> str:
        # Check that client exists and is active
        client = self.client_repo.get_by_client_id(client_id)
        if not client or not client.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid client_id",
            )

        # Validate redirect URI
        if redirect_uri not in client.redirect_uris:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid redirect_uri",
            )

        # Generate a secure 32-byte authorization code
        code = secrets.token_urlsafe(32)

        # Set code lifetime (5 minutes)
        expires_at = datetime.now(UTC) + timedelta(minutes=5)

        code_data = {
            "code": code,
            "client_id": client_id,
            "user_id": user_id,
            "redirect_uri": redirect_uri,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
            "scopes": scopes,
            "expires_at": expires_at,
            "consumed_at": None,
        }

        self.code_repo.create(code_data)
        return code

    def exchange_code(
        self,
        code: str,
        code_verifier: str,
        client_id: str,
        redirect_uri: str,
        client_secret: str | None = None,
    ) -> dict:
        # Retrieve code
        auth_code = self.code_repo.get_by_code(code)
        if not auth_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_grant",
                    "error_description": "Authorization code not found",
                },
            )

        # Retrieve client
        client = self.client_repo.get_by_client_id(client_id)
        if not client or not client.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_client",
                    "error_description": "Invalid client",
                },
            )

        # Check client credentials if confidential
        if client.client_type == "confidential":
            if not client_secret or OAuthClientService.hash_secret(client_secret) != client.client_secret_hash:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "invalid_client",
                        "error_description": "Client credentials verification failed",
                    },
                )

        # Check if code is already consumed (reuse detection)
        if auth_code.consumed_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_grant",
                    "error_description": "Authorization code has already been consumed",
                },
            )

        # Check client mismatch
        if auth_code.client_id != client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_grant",
                    "error_description": "Client ID mismatch",
                },
            )

        # Check redirect URI mismatch
        if auth_code.redirect_uri != redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_grant",
                    "error_description": "Redirect URI mismatch",
                },
            )

        # Check expiration
        expires_at = auth_code.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at < datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_grant",
                    "error_description": "Authorization code has expired",
                },
            )

        # Validate PKCE
        if auth_code.code_challenge_method == "S256":
            # Compute base64url-encoded SHA-256 of code_verifier
            h = hashlib.sha256(code_verifier.encode("ascii")).digest()
            challenge = base64.urlsafe_b64encode(h).decode("ascii").rstrip("=")
            if not secrets.compare_digest(challenge, auth_code.code_challenge):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid_grant",
                        "error_description": "PKCE verification failed",
                    },
                )
        elif auth_code.code_challenge_method == "plain":
            if not secrets.compare_digest(code_verifier, auth_code.code_challenge):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "invalid_grant",
                        "error_description": "PKCE verification failed",
                    },
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_grant",
                    "error_description": "Unsupported code_challenge_method",
                },
            )

        # Mark code as consumed
        self.code_repo.update(auth_code, {"consumed_at": datetime.now(UTC)})

        # Issue token
        user = self.db.query(User).filter(User.id == auth_code.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "invalid_grant",
                    "error_description": "User is inactive or not found",
                },
            )

        access_token = create_access_token(
            subject=str(user.entra_object_id),
            claims={
                "email": user.email,
                "full_name": user.full_name,
                "scope": "mcp",
            },
        )

        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": settings.app_jwt_expire_minutes * 60,
        }
