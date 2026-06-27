from datetime import UTC, datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Database(Base):
    __tablename__ = "databases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    sql_server_id: Mapped[int] = mapped_column(
        ForeignKey("sql_servers.id"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    sql_server = relationship("SQLServer", back_populates="databases")

    __table_args__ = (
        UniqueConstraint("sql_server_id", "name", name="uq_database_server_name"),
    )