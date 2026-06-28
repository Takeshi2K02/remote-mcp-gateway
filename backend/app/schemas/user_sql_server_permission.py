from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserSQLServerPermissionCreate(BaseModel):
    user_id: int
    sql_server_id: int


class UserSQLServerPermissionResponse(UserSQLServerPermissionCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)