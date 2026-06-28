from functools import lru_cache
import jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import get_settings

bearer_scheme = HTTPBearer(
    bearerFormat="JWT",
    scheme_name="Bearer Authentication",
    description="Paste the Microsoft Entra ID access token here.",
)


@lru_cache
def get_jwks_client() -> jwt.PyJWKClient:
    settings = get_settings()
    jwks_url = (
        f"https://login.microsoftonline.com/"
        f"{settings.entra_tenant_id}/discovery/v2.0/keys"
    )
    return jwt.PyJWKClient(jwks_url)


def verify_access_token(
    credentials: HTTPAuthorizationCredentials,
) -> dict:
    settings = get_settings()
    token = credentials.credentials

    try:
        signing_key = get_jwks_client().get_signing_key_from_jwt(token)

        payload = jwt.decode(
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

        return payload

    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        ) from exc

    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc