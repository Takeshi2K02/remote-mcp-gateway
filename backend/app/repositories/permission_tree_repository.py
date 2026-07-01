from sqlalchemy.orm import Session
from app.models.sql_server import SQLServer
from app.models.database import Database
from app.models.database_table import DatabaseTable
from app.models.user_sql_server_permission import UserSQLServerPermission
from app.models.user_database_permission import UserDatabasePermission
from app.models.user_table_permission import UserTablePermission
from app.schemas.permission_tree import ServerNode, DatabaseNode, TableNode


class PermissionTreeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_permission_tree(self, user_id: int) -> list[ServerNode]:
        # 1. Fetch all resources
        servers = self.db.query(SQLServer).order_by(SQLServer.name.asc()).all()
        databases = self.db.query(Database).order_by(Database.name.asc()).all()
        tables = self.db.query(DatabaseTable).order_by(DatabaseTable.schema_name.asc(), DatabaseTable.table_name.asc()).all()

        # 2. Fetch user permissions
        server_perms = self.db.query(UserSQLServerPermission.sql_server_id).filter(
            UserSQLServerPermission.user_id == user_id
        ).all()
        db_perms = self.db.query(UserDatabasePermission.database_id).filter(
            UserDatabasePermission.user_id == user_id
        ).all()
        table_perms = self.db.query(UserTablePermission.table_id).filter(
            UserTablePermission.user_id == user_id
        ).all()

        # 3. Create quick lookup sets
        checked_servers = {p[0] for p in server_perms}
        checked_dbs = {p[0] for p in db_perms}
        checked_tables = {p[0] for p in table_perms}

        # 4. Group databases by server ID
        db_by_server: dict[int, list[Database]] = {}
        for db in databases:
            db_by_server.setdefault(db.sql_server_id, []).append(db)

        # 5. Group tables by database ID
        table_by_db: dict[int, list[DatabaseTable]] = {}
        for t in tables:
            table_by_db.setdefault(t.database_id, []).append(t)

        # 6. Build the hierarchy
        server_nodes = []
        for s in servers:
            db_nodes = []
            server_dbs = db_by_server.get(s.id, [])

            for db in server_dbs:
                tbl_nodes = []
                db_tables = table_by_db.get(db.id, [])

                for t in db_tables:
                    tbl_nodes.append(
                        TableNode(
                            table_id=t.id,
                            table_name=t.table_name,
                            schema_name=t.schema_name,
                            checked=t.id in checked_tables,
                        )
                    )

                db_nodes.append(
                    DatabaseNode(
                        database_id=db.id,
                        database_name=db.name,
                        checked=db.id in checked_dbs,
                        tables=tbl_nodes,
                    )
                )

            server_nodes.append(
                ServerNode(
                    server_id=s.id,
                    server_name=s.name,
                    checked=s.id in checked_servers,
                    databases=db_nodes,
                )
            )

        return server_nodes
