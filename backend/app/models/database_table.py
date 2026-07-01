from datetime import UTC, datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class DatabaseTable(Base):
    __tablename__ = "database_tables"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    database_id: Mapped[int] = mapped_column(
        ForeignKey("databases.id"),
        nullable=False,
        index=True,
    )

    schema_name: Mapped[str] = mapped_column(
        String(255),
        default="dbo",
        nullable=False,
    )

    table_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
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

    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    database = relationship("Database")

    __table_args__ = (
        UniqueConstraint(
            "database_id",
            "schema_name",
            "table_name",
            name="uq_database_schema_table",
        ),
    )