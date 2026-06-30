from datetime import UTC, datetime, timedelta
from typing import Any
from jose import jwt
from app.core.config import get_settings

settings = get_settings()


def create_access_token(
    subject: str,
    claims: dict[str, Any] | None = None,
) -> str:
    expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.app_jwt_expire_minutes
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expires_at,
        "iat": datetime.now(UTC),
        "type": "access",
    }

    if claims:
        payload.update(claims)

    return jwt.encode(
        payload,
        settings.app_jwt_secret_key,
        algorithm=settings.app_jwt_algorithm,
    )