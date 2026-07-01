from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.repositories.permission_tree_repository import PermissionTreeRepository
from app.schemas.permission_tree import PermissionChange, ServerNode
from app.models.sql_server import SQLServer
from app.models.database import Database
from app.models.database_table import DatabaseTable
from app.models.user_sql_server_permission import UserSQLServerPermission
from app.models.user_database_permission import UserDatabasePermission
from app.models.user_table_permission import UserTablePermission


class PermissionTreeService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = PermissionTreeRepository(db)

    def get_permission_tree(self, user_id: int) -> list[ServerNode]:
        return self.repository.get_permission_tree(user_id)

    def sync_permissions(self, user_id: int, changes: list[PermissionChange]) -> None:
        try:
            for change in changes:
                level = change.level
                resource_id = change.resource_id
                grant = change.grant

                if level == "server":
                    if grant:
                        # Grant server permission
                        existing = self.db.query(UserSQLServerPermission).filter(
                            UserSQLServerPermission.user_id == user_id,
                            UserSQLServerPermission.sql_server_id == resource_id,
                        ).first()
                        if not existing:
                            perm = UserSQLServerPermission(user_id=user_id, sql_server_id=resource_id)
                            self.db.add(perm)
                    else:
                        # Revoke server permission
                        self.db.query(UserSQLServerPermission).filter(
                            UserSQLServerPermission.user_id == user_id,
                            UserSQLServerPermission.sql_server_id == resource_id,
                        ).delete()

                        # Cascade delete database permissions under this server
                        dbs = self.db.query(Database.id).filter(Database.sql_server_id == resource_id).all()
                        db_ids = [d[0] for d in dbs]
                        if db_ids:
                            self.db.query(UserDatabasePermission).filter(
                                UserDatabasePermission.user_id == user_id,
                                UserDatabasePermission.database_id.in_(db_ids),
                            ).delete()

                            # Cascade delete table permissions under these databases
                            tbls = self.db.query(DatabaseTable.id).filter(DatabaseTable.database_id.in_(db_ids)).all()
                            tbl_ids = [t[0] for t in tbls]
                            if tbl_ids:
                                self.db.query(UserTablePermission).filter(
                                    UserTablePermission.user_id == user_id,
                                    UserTablePermission.table_id.in_(tbl_ids),
                                ).delete()

                elif level == "database":
                    if grant:
                        # Grant database permission
                        db_record = self.db.query(Database).filter(Database.id == resource_id).first()
                        if not db_record:
                            continue

                        # Ensure parent server permission exists
                        server_id = db_record.sql_server_id
                        existing_server_perm = self.db.query(UserSQLServerPermission).filter(
                            UserSQLServerPermission.user_id == user_id,
                            UserSQLServerPermission.sql_server_id == server_id,
                        ).first()
                        if not existing_server_perm:
                            perm_server = UserSQLServerPermission(user_id=user_id, sql_server_id=server_id)
                            self.db.add(perm_server)

                        # Create database permission
                        existing_db_perm = self.db.query(UserDatabasePermission).filter(
                            UserDatabasePermission.user_id == user_id,
                            UserDatabasePermission.database_id == resource_id,
                        ).first()
                        if not existing_db_perm:
                            perm_db = UserDatabasePermission(user_id=user_id, database_id=resource_id)
                            self.db.add(perm_db)
                    else:
                        # Revoke database permission
                        self.db.query(UserDatabasePermission).filter(
                            UserDatabasePermission.user_id == user_id,
                            UserDatabasePermission.database_id == resource_id,
                        ).delete()

                        # Cascade delete table permissions under this database
                        tbls = self.db.query(DatabaseTable.id).filter(DatabaseTable.database_id == resource_id).all()
                        tbl_ids = [t[0] for t in tbls]
                        if tbl_ids:
                            self.db.query(UserTablePermission).filter(
                                UserTablePermission.user_id == user_id,
                                UserTablePermission.table_id.in_(tbl_ids),
                            ).delete()

                elif level == "table":
                    if grant:
                        # Grant table permission
                        table_record = self.db.query(DatabaseTable).filter(DatabaseTable.id == resource_id).first()
                        if not table_record:
                            continue

                        db_record = self.db.query(Database).filter(Database.id == table_record.database_id).first()
                        if not db_record:
                            continue

                        # Ensure parent server permission exists
                        server_id = db_record.sql_server_id
                        existing_server_perm = self.db.query(UserSQLServerPermission).filter(
                            UserSQLServerPermission.user_id == user_id,
                            UserSQLServerPermission.sql_server_id == server_id,
                        ).first()
                        if not existing_server_perm:
                            perm_server = UserSQLServerPermission(user_id=user_id, sql_server_id=server_id)
                            self.db.add(perm_server)

                        # Ensure parent database permission exists
                        existing_db_perm = self.db.query(UserDatabasePermission).filter(
                            UserDatabasePermission.user_id == user_id,
                            UserDatabasePermission.database_id == db_record.id,
                        ).first()
                        if not existing_db_perm:
                            perm_db = UserDatabasePermission(user_id=user_id, database_id=db_record.id)
                            self.db.add(perm_db)

                        # Create table permission
                        existing_table_perm = self.db.query(UserTablePermission).filter(
                            UserTablePermission.user_id == user_id,
                            UserTablePermission.table_id == resource_id,
                        ).first()
                        if not existing_table_perm:
                            perm_table = UserTablePermission(user_id=user_id, table_id=resource_id)
                            self.db.add(perm_table)
                    else:
                        # Revoke table permission
                        self.db.query(UserTablePermission).filter(
                            UserTablePermission.user_id == user_id,
                            UserTablePermission.table_id == resource_id,
                        ).delete()

            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to synchronize permissions in transaction: {str(e)}",
            )
