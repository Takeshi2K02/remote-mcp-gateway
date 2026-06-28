from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DatabaseTableCreate(BaseModel):
    database_id: int
    schema_name: str = "dbo"
    table_name: str
    description: str | None = None


class DatabaseTableUpdate(BaseModel):
    schema_name: str | None = None
    table_name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class DatabaseTableResponse(DatabaseTableCreate):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)