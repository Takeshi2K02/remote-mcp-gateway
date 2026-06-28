from sqlalchemy.orm import Session
from app.models.database import Database
from app.schemas.database import DatabaseCreate, DatabaseUpdate
from app.models.user_database_permission import UserDatabasePermission
from app.models.user import User

class DatabaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, database_id: int) -> Database | None:
        return self.db.query(Database).filter(Database.id == database_id).first()

    def get_by_server_and_name(
        self,
        sql_server_id: int,
        name: str,
    ) -> Database | None:
        return (
            self.db.query(Database)
            .filter(
                Database.sql_server_id == sql_server_id,
                Database.name == name,
            )
            .first()
        )

    def list_all(self, current_user: User):
        return (
            self.db.query(Database)
            .join(
                UserDatabasePermission,
                Database.id == UserDatabasePermission.database_id,
            )
            .filter(UserDatabasePermission.user_id == current_user.id)
            .all()
        )

    def create(self, data: DatabaseCreate) -> Database:
        database = Database(**data.model_dump())
        self.db.add(database)
        self.db.commit()
        self.db.refresh(database)
        return database

    def update(self, database: Database, data: DatabaseUpdate) -> Database:
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(database, field, value)

        self.db.commit()
        self.db.refresh(database)
        return database

    def delete(self, database: Database) -> None:
        self.db.delete(database)
        self.db.commit()