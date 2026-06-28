from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SQLServerBase(BaseModel):
    name: str
    host: str
    port: int = 1433
    description: str | None = None
    is_active: bool = True


class SQLServerCreate(SQLServerBase):
    pass


class SQLServerUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    port: int | None = None
    description: str | None = None
    is_active: bool | None = None


class SQLServerResponse(SQLServerBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)