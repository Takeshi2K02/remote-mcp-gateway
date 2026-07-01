from pydantic import BaseModel


class FailedDatabase(BaseModel):
    database_id: int | None
    name: str
    error: str


class SyncResponse(BaseModel):
    databases_added: int = 0
    databases_updated: int = 0
    tables_added: int = 0
    tables_updated: int = 0
    failed_databases: list[FailedDatabase] = []
