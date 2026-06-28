from sqlalchemy.orm import Session
from app.models.database_table import DatabaseTable
from app.schemas.database_table import (
    DatabaseTableCreate,
    DatabaseTableUpdate,
)


class DatabaseTableRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self):
        return self.db.query(DatabaseTable).all()

    def get_by_id(self, table_id: int):
        return self.db.query(DatabaseTable).filter(
            DatabaseTable.id == table_id
        ).first()

    def get_by_name(
        self,
        database_id: int,
        schema_name: str,
        table_name: str,
    ):
        return (
            self.db.query(DatabaseTable)
            .filter(
                DatabaseTable.database_id == database_id,
                DatabaseTable.schema_name == schema_name,
                DatabaseTable.table_name == table_name,
            )
            .first()
        )

    def create(self, data: DatabaseTableCreate):
        table = DatabaseTable(**data.model_dump())
        self.db.add(table)
        self.db.commit()
        self.db.refresh(table)
        return table

    def update(
        self,
        table: DatabaseTable,
        data: DatabaseTableUpdate,
    ):
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(table, key, value)

        self.db.commit()
        self.db.refresh(table)
        return table

    def delete(self, table: DatabaseTable):
        self.db.delete(table)
        self.db.commit()