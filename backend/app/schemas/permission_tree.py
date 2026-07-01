from pydantic import BaseModel


class TableNode(BaseModel):
    table_id: int
    table_name: str
    schema_name: str
    checked: bool


class DatabaseNode(BaseModel):
    database_id: int
    database_name: str
    checked: bool
    tables: list[TableNode]


class ServerNode(BaseModel):
    server_id: int
    server_name: str
    checked: bool
    databases: list[DatabaseNode]


class PermissionChange(BaseModel):
    level: str  # "server", "database", "table"
    resource_id: int
    grant: bool


class PermissionSyncRequest(BaseModel):
    changes: list[PermissionChange]
