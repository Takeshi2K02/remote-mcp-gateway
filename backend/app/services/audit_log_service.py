from sqlalchemy.orm import Session
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.audit_log import AuditLogCreate


class AuditLogService:
    def __init__(self, db: Session):
        self.repository = AuditLogRepository(db)

    def record(self, data: AuditLogCreate) -> None:
        self.repository.create(data)