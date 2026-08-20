from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class AuditLogCreate(BaseModel):
    user_id: int
    sql_server_id: int
    database_id: int
    table_id: int | None = None
    request_id: str
    tool_name: str
    action: str
    query_text: str | None = None
    row_count: int | None = None
    duration_ms: int | None = None
    status: str
    details: str | None = None
    error_message: str | None = None


class AuditLogResponse(AuditLogCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogRead(BaseModel):
    """
    Read model for the admin console.

    The stored row references its user/server/database/table by id only, so the
    console would otherwise have to fetch four more collections and join them
    client-side just to render one line. The resolved names are folded in here
    instead, which is also why this is a separate schema from AuditLogResponse
    (the write-shaped echo used when a row is recorded).
    """

    id: int
    created_at: datetime
    actor_name: str
    actor_email: str
    action: str
    tool_name: str
    target: str
    status: str
    detail: str | None = None
    request_id: str
    duration_ms: int | None = None
    row_count: int | None = None


class ActivityVolumePoint(BaseModel):
    day: date
    count: int
