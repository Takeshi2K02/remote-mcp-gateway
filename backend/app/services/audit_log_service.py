from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.audit_log import (
    ActivityVolumePoint,
    AuditLogCreate,
    AuditLogRead,
)


class AuditLogService:
    def __init__(self, db: Session):
        self.repository = AuditLogRepository(db)

    def record(self, data: AuditLogCreate) -> None:
        self.repository.create(data)

    def list_recent(self, limit: int = 200, offset: int = 0) -> list[AuditLogRead]:
        return [self._to_read(row) for row in self.repository.list_recent(limit, offset)]

    def activity_volume(self, days: int = 7) -> list[ActivityVolumePoint]:
        """
        Event counts per day, oldest first, with empty days included.

        The chart draws a bar per day and would otherwise collapse a quiet
        Saturday into the neighbouring bar, so days with no events are emitted
        with a count of 0 rather than omitted.
        """
        today = datetime.now(UTC).date()
        window = [today - timedelta(days=offset) for offset in range(days - 1, -1, -1)]

        since = datetime.combine(window[0], datetime.min.time(), tzinfo=UTC)
        counts: dict[date, int] = {day: 0 for day in window}

        for row in self.repository.list_created_since(since):
            day = self._as_utc(row.created_at).date()
            if day in counts:
                counts[day] += 1

        return [ActivityVolumePoint(day=day, count=counts[day]) for day in window]

    def _to_read(self, row: AuditLog) -> AuditLogRead:
        user = row.user
        database = row.database

        # The tool name alone ("query_database") does not say what it ran
        # against, which is the first thing an admin scanning the list wants.
        target = row.tool_name
        if database is not None:
            target = f"{row.tool_name} ({database.name})"

        return AuditLogRead(
            id=row.id,
            created_at=self._as_utc(row.created_at),
            actor_name=(user.full_name or user.email) if user else "Unknown user",
            actor_email=user.email if user else "",
            action=row.action,
            tool_name=row.tool_name,
            target=target,
            status=row.status,
            # Ordered by usefulness when the row is expanded: the failure
            # reason beats the statement, which beats the free-form note.
            detail=row.error_message or row.query_text or row.details,
            request_id=row.request_id,
            duration_ms=row.duration_ms,
            row_count=row.row_count,
        )

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        """
        Rows written before the column was timezone-aware come back naive, and
        comparing or bucketing those against an aware "now" raises. They were
        always stored as UTC, so labelling them is enough.
        """
        return value if value.tzinfo else value.replace(tzinfo=UTC)
