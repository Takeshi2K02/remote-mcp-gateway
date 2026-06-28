from fastapi import APIRouter, Request, Depends
from authlib.integrations.starlette_client import OAuth
from app.core.config import get_settings
from app.auth.dependencies import get_current_user
from app.models.user import User

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth = OAuth()

oauth.register(
    name="microsoft",
    client_id=settings.entra_client_id,
    client_secret=settings.entra_client_secret,
    server_metadata_url=(
        f"https://login.microsoftonline.com/"
        f"{settings.entra_tenant_id}/v2.0/.well-known/openid-configuration"
    ),
    client_kwargs={
        "scope": "openid profile email User.Read",
        "timeout": 30,
    },
)


@router.get("/login")
async def login(request: Request):
    redirect_uri = "http://localhost:8000/auth/callback"
    return await oauth.microsoft.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def auth_callback(request: Request):
    token = await oauth.microsoft.authorize_access_token(request)

    return {
        "access_token": token.get("access_token"),
        "id_token": token.get("id_token"),
        "token_type": token.get("token_type"),
        "expires_in": token.get("expires_in"),
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "entra_object_id": current_user.entra_object_id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
    }

# TODO (Production):
# Replace this development implementation that returns Microsoft access/id tokens.
# Instead:
# 1. Validate and process the authenticated user.
# 2. Create/update the user in the database.
# 3. Establish a secure application session (or issue an application-specific JWT).
# 4. Redirect the user to the frontend without exposing Microsoft tokens.
# This endpoint currently returns tokens only for development and testing purposes.