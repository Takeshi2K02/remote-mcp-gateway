from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import Database
from app.models.database_table import DatabaseTable
from app.models.user import User
from app.models.user_database_permission import UserDatabasePermission
from app.models.user_sql_server_permission import UserSQLServerPermission
from app.models.user_table_permission import UserTablePermission


def require_admin(current_user: User) -> None:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users are not allowed",
        )
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )


def require_sql_server_access(
    db: Session,
    current_user: User,
    sql_server_id: int,
) -> None:
    permission = (
        db.query(UserSQLServerPermission)
        .filter(
            UserSQLServerPermission.user_id == current_user.id,
            UserSQLServerPermission.sql_server_id == sql_server_id,
        )
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this SQL server",
        )


def require_database_access(
    db: Session,
    current_user: User,
    database_id: int,
) -> Database:
    database = db.query(Database).filter(Database.id == database_id).first()

    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found",
        )

    require_sql_server_access(
        db=db,
        current_user=current_user,
        sql_server_id=database.sql_server_id,
    )

    permission = (
        db.query(UserDatabasePermission)
        .filter(
            UserDatabasePermission.user_id == current_user.id,
            UserDatabasePermission.database_id == database_id,
        )
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this database",
        )

    return database


def require_table_access(
    db: Session,
    current_user: User,
    table_id: int,
) -> DatabaseTable:
    table = db.query(DatabaseTable).filter(DatabaseTable.id == table_id).first()

    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table not found",
        )

    require_database_access(
        db=db,
        current_user=current_user,
        database_id=table.database_id,
    )

    permission = (
        db.query(UserTablePermission)
        .filter(
            UserTablePermission.user_id == current_user.id,
            UserTablePermission.table_id == table_id,
        )
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have access to this table",
        )

    return table

# ============================================================================
# TODO (MCP Integration)
#
# These authorization helpers currently protect the REST API endpoints.
#
# When implementing the MCP query execution layer, authorization MUST also be
# enforced before executing any SQL query. The execution pipeline should:
#
# 1. Authenticate the user.
# 2. Determine the target SQL Server.
# 3. Verify SQL Server permission.
# 4. Verify Database permission.
# 5. Parse the SQL query to identify referenced tables.
# 6. Verify permission for every referenced table.
# 7. Execute the query only if all authorization checks succeed.
#
# The MCP layer must never rely solely on API-level authorization, since AI
# clients (e.g., Claude) will execute queries through MCP rather than these
# CRUD endpoints.
# ============================================================================