from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserTablePermissionCreate(BaseModel):
    user_id: int
    table_id: int


class UserTablePermissionResponse(UserTablePermissionCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)