from datetime import UTC, datetime
from functools import lru_cache
from typing import Any
import jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt as jose_jwt
from app.core.config import get_settings

bearer_scheme = HTTPBearer(
    bearerFormat="JWT",
    scheme_name="Bearer Authentication",
    description="Paste the application JWT here.",
)


@lru_cache
def get_jwks_client() -> jwt.PyJWKClient:
    settings = get_settings()
    jwks_url = (
        f"https://login.microsoftonline.com/"
        f"{settings.entra_tenant_id}/discovery/v2.0/keys"
    )
    return jwt.PyJWKClient(jwks_url)


def verify_entra_access_token(
    credentials: HTTPAuthorizationCredentials,
) -> dict[str, Any]:
    settings = get_settings()
    token = credentials.credentials

    try:
        signing_key = get_jwks_client().get_signing_key_from_jwt(token)

        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=[
                settings.entra_client_id,
                f"api://{settings.entra_client_id}",
            ],
            issuer=[
                f"https://login.microsoftonline.com/{settings.entra_tenant_id}/v2.0",
                f"https://sts.windows.net/{settings.entra_tenant_id}/",
            ],
        )

    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Microsoft token has expired",
        ) from exc

    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Microsoft token",
        ) from exc


def verify_app_access_token(
    credentials: HTTPAuthorizationCredentials,
) -> dict[str, Any]:
    settings = get_settings()
    token = credentials.credentials

    try:
        payload = jose_jwt.decode(
            token,
            settings.app_jwt_secret_key,
            algorithms=[settings.app_jwt_algorithm],
        )

        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )

        expires_at = payload.get("exp")
        if expires_at and datetime.fromtimestamp(expires_at, UTC) < datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Application token has expired",
            )

        return payload

    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid application token",
        ) from exc