from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.audit_log import ActivityVolumePoint, AuditLogRead
from app.services.audit_log_service import AuditLogService

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/", response_model=list[AuditLogRead])
def list_audit_logs(
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AuditLogService(db).list_recent(limit=limit, offset=offset)


@router.get("/activity-volume", response_model=list[ActivityVolumePoint])
def get_activity_volume(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AuditLogService(db).activity_volume(days=days)
