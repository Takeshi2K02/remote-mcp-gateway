from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserUpdate


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_entra_object_id(self, entra_object_id: str) -> User | None:
        return self.db.query(User).filter(User.entra_object_id == entra_object_id).first()

    def list_all(self) -> list[User]:
        return self.db.query(User).order_by(User.id.asc()).all()

    def update(self, user: User, data: UserUpdate) -> User:
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user
