from datetime import UTC, datetime
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class UserSQLServerPermission(Base):
    __tablename__ = "user_sql_server_permissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    sql_server_id: Mapped[int] = mapped_column(
        ForeignKey("sql_servers.id"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    user = relationship("User")
    sql_server = relationship("SQLServer")

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "sql_server_id",
            name="uq_user_sql_server_permission",
        ),
    )