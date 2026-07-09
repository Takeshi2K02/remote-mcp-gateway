from sqlalchemy.orm import Session

from app.models.user_event import UserEvent
from app.schemas.user_event import UserEventCreate


class UserEventRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: UserEventCreate) -> UserEvent:
        event = UserEvent(**data.model_dump())

        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)

        return event

    def exists_for_user(self, user_id: int, event_type: str) -> bool:
        return (
            self.db.query(UserEvent.id)
            .filter(
                UserEvent.user_id == user_id,
                UserEvent.event_type == event_type,
            )
            .first()
            is not None
        )

    def list_for_user(self, user_id: int) -> list[UserEvent]:
        return (
            self.db.query(UserEvent)
            .filter(UserEvent.user_id == user_id)
            .order_by(UserEvent.created_at.desc())
            .all()
        )
