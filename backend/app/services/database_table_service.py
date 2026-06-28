from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.database_repository import DatabaseRepository
from app.repositories.database_table_repository import DatabaseTableRepository
from app.schemas.database_table import (
    DatabaseTableCreate,
    DatabaseTableUpdate,
)


class DatabaseTableService:
    def __init__(self, db: Session):
        self.repository = DatabaseTableRepository(db)
        self.database_repository = DatabaseRepository(db)

    def list_tables(self):
        return self.repository.list_all()

    def get_table(self, table_id: int):
        table = self.repository.get_by_id(table_id)

        if not table:
            raise HTTPException(404, "Table not found")

        return table

    def create_table(self, data: DatabaseTableCreate):
        database = self.database_repository.get_by_id(data.database_id)

        if not database:
            raise HTTPException(404, "Database not found")

        existing = self.repository.get_by_name(
            data.database_id,
            data.schema_name,
            data.table_name,
        )

        if existing:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Table already registered",
            )

        return self.repository.create(data)

    def update_table(
        self,
        table_id: int,
        data: DatabaseTableUpdate,
    ):
        table = self.get_table(table_id)
        return self.repository.update(table, data)

    def delete_table(self, table_id: int):
        table = self.get_table(table_id)
        self.repository.delete(table)