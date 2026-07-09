from datetime import UTC, datetime
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class UserEvent(Base):
    """
    Identity lifecycle events (provisioning, first login, ...).

    Kept separate from audit_logs, which is scoped to data-access events
    (SQL server/database/table are non-nullable there) and cannot represent
    an identity event that has no associated SQL resource.
    """

    __tablename__ = "user_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    details: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("User")
