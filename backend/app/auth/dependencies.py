from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import bearer_scheme, verify_app_access_token
from app.db.database import get_db
from app.models.user import User
from app.services.user_service import UserService


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = verify_app_access_token(credentials)

    entra_object_id = payload.get("sub")
    email = payload.get("email")
    full_name = payload.get("full_name")

    if not entra_object_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid application token claims",
        )

    # A valid app JWT is only ever minted after /auth/callback has already
    # provisioned this user, so this call is a defense-in-depth backstop
    # (e.g. the user row was deleted after the token was issued), not the
    # primary provisioning path.
    user, _created = UserService(db).get_or_provision(
        entra_object_id=entra_object_id,
        email=email,
        full_name=full_name,
    )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user