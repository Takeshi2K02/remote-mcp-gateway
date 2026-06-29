from sqlalchemy.orm import Session

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