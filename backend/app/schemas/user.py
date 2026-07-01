from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    email: str
    full_name: str | None = None
    is_active: bool = True
    is_admin: bool = False


class UserUpdate(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class UserResponse(UserBase):
    id: int
    entra_object_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
