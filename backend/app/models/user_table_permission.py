from datetime import UTC, datetime
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class UserTablePermission(Base):
    __tablename__ = "user_table_permissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    table_id: Mapped[int] = mapped_column(
        ForeignKey("database_tables.id"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("User")
    table = relationship("DatabaseTable")

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "table_id",
            name="uq_user_table_permission",
        ),
    )