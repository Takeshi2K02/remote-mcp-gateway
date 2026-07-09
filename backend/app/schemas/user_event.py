from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserEventCreate(BaseModel):
    user_id: int
    event_type: str
    details: str | None = None


class UserEventResponse(BaseModel):
    id: int
    user_id: int
    event_type: str
    details: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
