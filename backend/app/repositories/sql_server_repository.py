from sqlalchemy.orm import Session
from app.models.sql_server import SQLServer
from app.schemas.sql_server import SQLServerCreate, SQLServerUpdate


class SQLServerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, sql_server_id: int) -> SQLServer | None:
        return (
            self.db.query(SQLServer)
            .filter(SQLServer.id == sql_server_id)
            .first()
        )

    def get_by_name(self, name: str) -> SQLServer | None:
        return (
            self.db.query(SQLServer)
            .filter(SQLServer.name == name)
            .first()
        )

    def list_all(self) -> list[SQLServer]:
        return (
            self.db.query(SQLServer)
            .order_by(SQLServer.created_at.desc())
            .all()
        )

    def create(self, data: SQLServerCreate) -> SQLServer:
        sql_server = SQLServer(**data.model_dump())

        self.db.add(sql_server)
        self.db.commit()
        self.db.refresh(sql_server)

        return sql_server

    def update(
        self,
        sql_server: SQLServer,
        data: SQLServerUpdate,
    ) -> SQLServer:
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(sql_server, field, value)

        self.db.commit()
        self.db.refresh(sql_server)

        return sql_server

    def delete(self, sql_server: SQLServer) -> None:
        self.db.delete(sql_server)
        self.db.commit()