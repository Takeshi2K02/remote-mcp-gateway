from datetime import datetime
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