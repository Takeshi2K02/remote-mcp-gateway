from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserDatabasePermissionBase(BaseModel):
    user_id: int
    database_id: int


class UserDatabasePermissionCreate(UserDatabasePermissionBase):
    pass


class UserDatabasePermissionResponse(UserDatabasePermissionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)