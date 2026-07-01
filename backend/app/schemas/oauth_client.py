from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class OAuthClientBase(BaseModel):
    client_name: str = Field(..., max_length=255)
    client_type: Literal["public", "confidential"]
    redirect_uris: list[str]
    allowed_scopes: list[str] = Field(default_factory=lambda: ["mcp"])
    is_active: bool = True


class OAuthClientCreate(OAuthClientBase):
    pass


class OAuthClientUpdate(BaseModel):
    client_name: str | None = Field(None, max_length=255)
    client_type: Literal["public", "confidential"] | None = None
    redirect_uris: list[str] | None = None
    allowed_scopes: list[str] | None = None
    is_active: bool | None = None


class OAuthClientResponse(OAuthClientBase):
    id: int
    client_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OAuthClientCreateResponse(OAuthClientResponse):
    client_secret: str | None = None  # Returned raw only once upon creation
