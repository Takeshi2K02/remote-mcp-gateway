from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from app.mcp.transport.lifespan import mcp_lifespan
from app.mcp.transport.http import mcp_asgi_app
from app.mcp.transport.discovery import router as discovery_router
from app.api.auth import router as auth_router
from app.api.database_tables import router as database_table_router
from app.api.databases import router as database_router
from app.api.sql_servers import router as sql_server_router
from app.api.user_database_permissions import (
    router as user_database_permission_router,
)
from app.api.user_sql_server_permissions import (
    router as user_sql_server_permission_router,
)
from app.api.user_table_permissions import (
    router as user_table_permission_router,
)
from app.api.oauth_clients import router as oauth_clients_router
from app.api.oauth import router as oauth_router
from app.api.users import router as users_router
from app.auth.middleware import MCPAuthMiddleware
from app.core.config import get_settings
from app.core.exceptions import unhandled_exception_handler
from app.core.logging import configure_logging
from app.db.database import get_db

# Before anything else that might log. Runs in every gunicorn worker (each
# imports this module) and is idempotent, so repeated calls are harmless.
configure_logging()

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=mcp_lifespan,
)

app.add_exception_handler(Exception, unhandled_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The session cookie set here is what /oauth/authorize treats as proof that a
# human has logged in through Entra. It is therefore the credential that lets a
# new OAuth client be authorized, so it does not take Starlette's defaults:
#
#   https_only=True  — Starlette defaults to False, which omits the Secure
#       attribute and lets the cookie ride a plaintext request. Azure always
#       serves this app over HTTPS, so there is nothing to lose by requiring it.
#   max_age=8h       — Starlette defaults to 1209600 (14 days). A fortnight is
#       far too long for a cookie that can silently authorize MCP clients; 8
#       hours is about one working day, after which Entra login is required.
#   same_site="lax"  — kept deliberately. "strict" would break the Entra round
#       trip, because the cookie must survive Microsoft's cross-site redirect
#       back to /auth/callback.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    https_only=True,
    same_site="lax",
    max_age=60 * 60 * 8,
)

app.add_middleware(MCPAuthMiddleware)


@app.get("/db-health")
def db_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"database": "connected"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "environment": settings.app_env,
    }


app.include_router(auth_router)
app.include_router(sql_server_router)
app.include_router(database_router)
app.include_router(user_database_permission_router)
app.include_router(user_sql_server_permission_router)
app.include_router(database_table_router)
app.include_router(user_table_permission_router)
app.include_router(oauth_clients_router)
app.include_router(oauth_router)
app.include_router(discovery_router)
app.include_router(users_router)
class MCPASGIWrapper:
    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        if path == "/mcp":
            scope["path"] = "/"
            scope["root_path"] = scope.get("root_path", "") + "/mcp"
        elif path.startswith("/mcp/"):
            scope["path"] = path[4:]
            scope["root_path"] = scope.get("root_path", "") + "/mcp"
        await mcp_asgi_app(scope, receive, send)


mcp_asgi_wrapper = MCPASGIWrapper()

app.add_route("/mcp", mcp_asgi_wrapper, methods=["GET", "POST", "OPTIONS"])  # type: ignore
app.add_route("/mcp/{path:path}", mcp_asgi_wrapper, methods=["GET", "POST", "OPTIONS"])  # type: ignore