from datetime import UTC, datetime
from sqlalchemy import Boolean, DateTime, String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class OAuthClient(Base):
    __tablename__ = "oauth_clients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    client_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    client_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    client_secret_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    client_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # "public" or "confidential"
    )
    redirect_uris: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
    )
    allowed_scopes: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
