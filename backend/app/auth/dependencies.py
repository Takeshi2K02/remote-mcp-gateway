from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import bearer_scheme, verify_access_token
from app.db.database import get_db
from app.models.user import User


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = verify_access_token(credentials)

    entra_object_id = payload.get("oid")
    email = payload.get("preferred_username") or payload.get("email")
    full_name = payload.get("name")

    if not entra_object_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims",
        )

    user = (
        db.query(User)
        .filter(User.entra_object_id == entra_object_id)
        .first()
    )

    if user:
        return user

    user = User(
        entra_object_id=entra_object_id,
        email=email,
        full_name=full_name,
        is_active=True, # check this later if we want to set this to false by default and require admin approval
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user