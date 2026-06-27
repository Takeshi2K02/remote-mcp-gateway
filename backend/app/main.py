from fastapi import FastAPI, Depends
from app.core.config import get_settings
from sqlalchemy import text
from app.db.database import get_db
from sqlalchemy.orm import Session

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