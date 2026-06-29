from app.db.database import SessionLocal
from app.mcp.connection_manager import SQLConnectionManager

db = SessionLocal()

manager = SQLConnectionManager(db)

engine = manager.get_engine(
    sql_server_id=2,
    database_id=2,
)

print(engine)

db.close()