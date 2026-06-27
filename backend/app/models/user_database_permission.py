from datetime import UTC, datetime
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class UserDatabasePermission(Base):
    __tablename__ = "user_database_permissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    database_id: Mapped[int] = mapped_column(
        ForeignKey("databases.id"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("User")
    database = relationship("Database")

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "database_id",
            name="uq_user_database_permission",
        ),
    )