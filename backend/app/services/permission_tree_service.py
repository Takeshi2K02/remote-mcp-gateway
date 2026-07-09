import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.permission_tree_repository import PermissionTreeRepository
from app.schemas.permission_tree import PermissionChange, ServerNode
from app.models.database import Database
from app.models.database_table import DatabaseTable
from app.models.user_sql_server_permission import UserSQLServerPermission
from app.models.user_database_permission import UserDatabasePermission
from app.models.user_table_permission import UserTablePermission

logger = logging.getLogger(__name__)


class PermissionTreeService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = PermissionTreeRepository(db)

    def get_permission_tree(self, user_id: int) -> list[ServerNode]:
        return self.repository.get_permission_tree(user_id)

    def sync_permissions(self, user_id: int, changes: list[PermissionChange]) -> None:
        # Tracks server/database permissions already ensured to exist during
        # this call, in-process. The session uses autoflush=False, so without
        # this a "grant database" change followed by several "grant table"
        # changes for the same database would each independently re-query for
        # the parent permission, find nothing (their siblings' inserts are
        # still unflushed), and each add a duplicate row — violating the
        # unique constraint at commit time.
        ensured_server_ids: set[int] = set()
        ensured_database_ids: set[int] = set()

        try:
            for change in changes:
                level = change.level
                resource_id = change.resource_id
                grant = change.grant

                if level == "server":
                    if grant:
                        self._ensure_server_permission(user_id, resource_id, ensured_server_ids)
                    else:
                        self._revoke_server_permission(user_id, resource_id)

                elif level == "database":
                    if grant:
                        db_record = self.db.query(Database).filter(Database.id == resource_id).first()
                        if not db_record:
                            raise HTTPException(
                                status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Database {resource_id} not found.",
                            )

                        self._ensure_server_permission(
                            user_id, db_record.sql_server_id, ensured_server_ids
                        )
                        self._ensure_database_permission(user_id, resource_id, ensured_database_ids)
                    else:
                        self._revoke_database_permission(user_id, resource_id)

                elif level == "table":
                    if grant:
                        table_record = self.db.query(DatabaseTable).filter(
                            DatabaseTable.id == resource_id
                        ).first()
                        if not table_record:
                            raise HTTPException(
                                status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Table {resource_id} not found.",
                            )

                        db_record = self.db.query(Database).filter(
                            Database.id == table_record.database_id
                        ).first()
                        if not db_record:
                            raise HTTPException(
                                status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Database {table_record.database_id} not found.",
                            )

                        self._ensure_server_permission(
                            user_id, db_record.sql_server_id, ensured_server_ids
                        )
                        self._ensure_database_permission(
                            user_id, db_record.id, ensured_database_ids
                        )

                        existing_table_perm = self.db.query(UserTablePermission).filter(
                            UserTablePermission.user_id == user_id,
                            UserTablePermission.table_id == resource_id,
                        ).first()
                        if not existing_table_perm:
                            self.db.add(
                                UserTablePermission(user_id=user_id, table_id=resource_id)
                            )
                    else:
                        self.db.query(UserTablePermission).filter(
                            UserTablePermission.user_id == user_id,
                            UserTablePermission.table_id == resource_id,
                        ).delete()

            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.exception(
                "Failed to synchronize permissions for user %d", user_id
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to synchronize permissions in transaction: {str(e)}",
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_server_permission(
        self, user_id: int, sql_server_id: int, ensured: set[int]
    ) -> None:
        if sql_server_id in ensured:
            return
        ensured.add(sql_server_id)

        existing = self.db.query(UserSQLServerPermission).filter(
            UserSQLServerPermission.user_id == user_id,
            UserSQLServerPermission.sql_server_id == sql_server_id,
        ).first()
        if not existing:
            self.db.add(
                UserSQLServerPermission(user_id=user_id, sql_server_id=sql_server_id)
            )

    def _ensure_database_permission(
        self, user_id: int, database_id: int, ensured: set[int]
    ) -> None:
        if database_id in ensured:
            return
        ensured.add(database_id)

        existing = self.db.query(UserDatabasePermission).filter(
            UserDatabasePermission.user_id == user_id,
            UserDatabasePermission.database_id == database_id,
        ).first()
        if not existing:
            self.db.add(
                UserDatabasePermission(user_id=user_id, database_id=database_id)
            )

    def _revoke_server_permission(self, user_id: int, sql_server_id: int) -> None:
        self.db.query(UserSQLServerPermission).filter(
            UserSQLServerPermission.user_id == user_id,
            UserSQLServerPermission.sql_server_id == sql_server_id,
        ).delete()

        db_ids = [
            row[0]
            for row in self.db.query(Database.id)
            .filter(Database.sql_server_id == sql_server_id)
            .all()
        ]
        if not db_ids:
            return

        self.db.query(UserDatabasePermission).filter(
            UserDatabasePermission.user_id == user_id,
            UserDatabasePermission.database_id.in_(db_ids),
        ).delete()

        tbl_ids = [
            row[0]
            for row in self.db.query(DatabaseTable.id)
            .filter(DatabaseTable.database_id.in_(db_ids))
            .all()
        ]
        if tbl_ids:
            self.db.query(UserTablePermission).filter(
                UserTablePermission.user_id == user_id,
                UserTablePermission.table_id.in_(tbl_ids),
            ).delete()

    def _revoke_database_permission(self, user_id: int, database_id: int) -> None:
        self.db.query(UserDatabasePermission).filter(
            UserDatabasePermission.user_id == user_id,
            UserDatabasePermission.database_id == database_id,
        ).delete()

        tbl_ids = [
            row[0]
            for row in self.db.query(DatabaseTable.id)
            .filter(DatabaseTable.database_id == database_id)
            .all()
        ]
        if tbl_ids:
            self.db.query(UserTablePermission).filter(
                UserTablePermission.user_id == user_id,
                UserTablePermission.table_id.in_(tbl_ids),
            ).delete()
