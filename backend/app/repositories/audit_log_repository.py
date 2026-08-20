from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogCreate


class AuditLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: AuditLogCreate) -> AuditLog:
        audit_log = AuditLog(**data.model_dump())

        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)

        return audit_log
    def list_recent(self, limit: int, offset: int = 0) -> list[AuditLog]:
        """
        Newest first, with the four related rows eager-loaded.

        The console renders actor and target names on every line, so lazy
        loading would turn one page of logs into 4N extra round trips.
        """
        return (
            self.db.query(AuditLog)
            .options(
                joinedload(AuditLog.user),
                joinedload(AuditLog.sql_server),
                joinedload(AuditLog.database),
                joinedload(AuditLog.table),
            )
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def list_created_since(self, since: datetime) -> list[AuditLog]:
        """Timestamps only would be enough here, but the caller buckets by day
        and the row count over a 7-day window stays small."""
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.created_at >= since)
            .order_by(AuditLog.created_at.asc())
            .all()
        )
