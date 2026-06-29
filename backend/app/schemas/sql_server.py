from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SQLServerBase(BaseModel):
    name: str
    host: str
    port: int = 1433

    authentication_type: str = "sql_password"
    username: str | None = None
    secret_reference: str | None = None
    connection_options: str | None = None

    description: str | None = None
    is_active: bool = True


class SQLServerCreate(SQLServerBase):
    pass


class SQLServerUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    port: int | None = None

    authentication_type: str | None = None
    username: str | None = None
    secret_reference: str | None = None
    connection_options: str | None = None

    description: str | None = None
    is_active: bool | None = None


class SQLServerResponse(SQLServerBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)