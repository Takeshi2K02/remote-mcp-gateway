from datetime import UTC, datetime
from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class SQLServer(Base):
    __tablename__ = "sql_servers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    host: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    port: Mapped[int] = mapped_column(
        default=1433,
        nullable=False,
    )

    authentication_type: Mapped[str] = mapped_column(
        String(50),
        default="sql_password",
        nullable=False,
    )

    username: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    secret_reference: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    connection_options: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
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

    databases = relationship(
        "Database",
        back_populates="sql_server",
        cascade="all, delete-orphan",
    )