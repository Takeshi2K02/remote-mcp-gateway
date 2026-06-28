from fastapi import FastAPI, Depends
from app.core.config import get_settings
from sqlalchemy import text
from app.db.database import get_db
from sqlalchemy.orm import Session
from app.api.sql_servers import router as sql_server_router
from app.api.databases import router as database_router
from app.api.user_database_permissions import router as user_database_permission_router
from starlette.middleware.sessions import SessionMiddleware
from app.api.auth import router as auth_router


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
)

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
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)
app.include_router(auth_router)
app.include_router(sql_server_router)
app.include_router(database_router)
app.include_router(user_database_permission_router)