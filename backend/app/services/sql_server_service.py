from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.sql_server_repository import SQLServerRepository
from app.schemas.sql_server import SQLServerCreate, SQLServerUpdate


class SQLServerService:
    def __init__(self, db: Session):
        self.repository = SQLServerRepository(db)

    def list_sql_servers(self):
        return self.repository.list_all()

    def get_sql_server(self, sql_server_id: int):
        sql_server = self.repository.get_by_id(sql_server_id)

        if not sql_server:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SQL server not found",
            )

        return sql_server

    def create_sql_server(self, data: SQLServerCreate):
        existing = self.repository.get_by_name(data.name)

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="SQL server name already exists",
            )

        return self.repository.create(data)

    def update_sql_server(self, sql_server_id: int, data: SQLServerUpdate):
        sql_server = self.get_sql_server(sql_server_id)

        if data.name:
            existing = self.repository.get_by_name(data.name)
            if existing and existing.id != sql_server_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="SQL server name already exists",
                )

        return self.repository.update(sql_server, data)

    def delete_sql_server(self, sql_server_id: int):
        sql_server = self.get_sql_server(sql_server_id)
        self.repository.delete(sql_server)