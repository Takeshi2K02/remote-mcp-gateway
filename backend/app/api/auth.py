from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from app.auth.dependencies import get_current_user
from app.auth.jwt_service import create_access_token
from app.core.config import get_settings
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
        "scope": (
            "openid profile email "
            "api://43208698-d37b-4218-9e06-d9a6a0834f1e/access_as_user"
        ),
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
    user_info = token.get("userinfo")

    if not user_info:
        user_info = await oauth.microsoft.userinfo(token=token)

    entra_object_id = user_info.get("oid") or user_info.get("sub")
    email = user_info.get("email") or user_info.get("preferred_username")
    full_name = user_info.get("name")

    app_token = create_access_token(
        subject=str(entra_object_id),
        claims={
            "email": email,
            "full_name": full_name,
        },
    )

    return RedirectResponse(
        url=f"{settings.frontend_base_url}/auth/callback?token={app_token}"
    )


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
# Complete local user sync during Microsoft callback:
# 1. Validate Microsoft identity claims.
# 2. Create/update local user by entra_object_id.
# 3. Reject inactive users.
# 4. Issue application JWT only after local authorization succeeds.
# 5. Prefer HttpOnly secure cookies before production deployment.