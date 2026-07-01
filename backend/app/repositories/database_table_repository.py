from datetime import UTC, datetime
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

    # Alias matching the discovery service convention
    def get_by_schema_and_name(
        self,
        database_id: int,
        schema_name: str,
        table_name: str,
    ):
        return self.get_by_name(database_id, schema_name, table_name)

    def list_by_database(self, database_id: int) -> list[DatabaseTable]:
        return (
            self.db.query(DatabaseTable)
            .filter(DatabaseTable.database_id == database_id)
            .all()
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

    def upsert(
        self,
        database_id: int,
        schema_name: str,
        table_name: str,
    ) -> tuple[DatabaseTable, bool]:
        """
        Insert or update a database table record.

        Returns (table, created) where created=True if a new row was inserted.
        Sets last_synced_at to now on every call.
        """
        existing = self.get_by_name(database_id, schema_name, table_name)
        now = datetime.now(UTC)

        if existing:
            existing.last_synced_at = now
            self.db.commit()
            self.db.refresh(existing)
            return existing, False

        table = DatabaseTable(
            database_id=database_id,
            schema_name=schema_name,
            table_name=table_name,
            is_active=True,
            last_synced_at=now,
        )
        self.db.add(table)
        self.db.commit()
        self.db.refresh(table)
        return table, True

    def delete(self, table: DatabaseTable):
        self.db.delete(table)
        self.db.commit()