from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DatabaseBase(BaseModel):
    sql_server_id: int
    name: str
    description: str | None = None
    is_active: bool = True


class DatabaseCreate(DatabaseBase):
    pass


class DatabaseUpdate(BaseModel):
    sql_server_id: int | None = None
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class DatabaseResponse(DatabaseBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)