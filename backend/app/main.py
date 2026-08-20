from fastapi import Depends, FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from app.mcp.transport.lifespan import mcp_lifespan
from app.mcp.transport.http import mcp_asgi_app
from app.mcp.transport.discovery import router as discovery_router
from app.api.audit_logs import router as audit_log_router
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

def _cors_allow_origins() -> list[str]:
    """
    Browser origins permitted to call this API.

    MCP_ALLOWED_ORIGINS and CORSMiddleware are two different mechanisms that
    were previously wired to different values: the MCP transport consulted the
    setting for its DNS-rebinding check while CORS trusted only the admin
    frontend. The result was that a preflight from https://claude.ai — an
    origin the setting explicitly allows — came back "400 Disallowed CORS
    origin", because CORS had never been told about it. Both now read the same
    list.

    Entries containing "*" are dropped: CORSMiddleware matches allow_origins
    exactly and has no glob support, so a pattern like "http://localhost:*"
    would never match anything and only give a false sense of coverage. The
    MCP layer keeps handling those patterns itself.
    """
    origins: list[str] = []
    if settings.frontend_base_url:
        origins.append(settings.frontend_base_url)

    for origin in settings.mcp_allowed_origins.split(","):
        origin = origin.strip()
        if origin and "*" not in origin:
            origins.append(origin)

    # dict.fromkeys preserves order while removing duplicates.
    return list(dict.fromkeys(origins))


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
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
app.include_router(audit_log_router)
# The methods the MCP Streamable HTTP app actually implements. It answers
# "Allow: GET, POST, DELETE" itself — GET opens the SSE stream, POST carries
# JSON-RPC, DELETE terminates a session. DELETE was previously missing from the
# route declaration, so an authenticated DELETE would have been rejected by
# routing before ever reaching the transport.
_MCP_TRANSPORT_METHODS = ["GET", "POST", "DELETE"]

# OPTIONS is declared on the route but never delegated (see below), so the two
# lists differ on purpose.
_MCP_ROUTE_METHODS = _MCP_TRANSPORT_METHODS + ["OPTIONS"]


class MCPASGIWrapper:
    async def __call__(self, scope, receive, send):
        # OPTIONS is answered here rather than passed down. A genuine CORS
        # preflight (Origin + Access-Control-Request-Method) never reaches this
        # point — CORSMiddleware sits further out and replies on its own — so
        # anything arriving here is a bare OPTIONS, typically a capability
        # probe. Handing those to the MCP app produced a confusing
        # "405 Method Not Allowed" JSON-RPC error, since the transport does not
        # implement OPTIONS. Answer the probe properly instead.
        if scope.get("method") == "OPTIONS":
            await Response(
                status_code=204,
                headers={"Allow": ", ".join(_MCP_ROUTE_METHODS)},
            )(scope, receive, send)
            return

        path = scope.get("path", "")
        if path == "/mcp":
            scope["path"] = "/"
            scope["root_path"] = scope.get("root_path", "") + "/mcp"
        elif path.startswith("/mcp/"):
            scope["path"] = path[4:]
            scope["root_path"] = scope.get("root_path", "") + "/mcp"
        await mcp_asgi_app(scope, receive, send)


mcp_asgi_wrapper = MCPASGIWrapper()

app.add_route("/mcp", mcp_asgi_wrapper, methods=_MCP_ROUTE_METHODS)  # type: ignore
app.add_route("/mcp/{path:path}", mcp_asgi_wrapper, methods=_MCP_ROUTE_METHODS)  # type: ignore