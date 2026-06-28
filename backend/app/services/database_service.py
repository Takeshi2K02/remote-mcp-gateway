from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.database_repository import DatabaseRepository
from app.repositories.sql_server_repository import SQLServerRepository
from app.schemas.database import DatabaseCreate, DatabaseUpdate


class DatabaseService:
    def __init__(self, db: Session):
        self.repository = DatabaseRepository(db)
        self.sql_server_repository = SQLServerRepository(db)

    def list_databases(self):
        return self.repository.list_all()

    def get_database(self, database_id: int):
        database = self.repository.get_by_id(database_id)

        if not database:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Database not found",
            )

        return database

    def create_database(self, data: DatabaseCreate):
        sql_server = self.sql_server_repository.get_by_id(data.sql_server_id)

        if not sql_server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SQL server not found",
            )

        existing = self.repository.get_by_server_and_name(
            data.sql_server_id,
            data.name,
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Database already exists on this SQL server",
            )

        return self.repository.create(data)

    def update_database(self, database_id: int, data: DatabaseUpdate):
        database = self.get_database(database_id)

        sql_server_id = (
            data.sql_server_id
            if data.sql_server_id is not None
            else database.sql_server_id
        )

        if data.sql_server_id is not None:
            sql_server = self.sql_server_repository.get_by_id(sql_server_id)

            if not sql_server:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="SQL server not found",
                )

        database_name = data.name if data.name is not None else database.name

        existing = self.repository.get_by_server_and_name(
            sql_server_id,
            database_name,
        )

        if existing and existing.id != database.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Database already exists on this SQL server",
            )

        return self.repository.update(database, data)

    def delete_database(self, database_id: int):
        database = self.get_database(database_id)
        self.repository.delete(database)