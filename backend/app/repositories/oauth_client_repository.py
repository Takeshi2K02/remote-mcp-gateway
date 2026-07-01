from sqlalchemy.orm import Session
from app.models.oauth_client import OAuthClient


class OAuthClientRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, client_internal_id: int) -> OAuthClient | None:
        return (
            self.db.query(OAuthClient)
            .filter(OAuthClient.id == client_internal_id)
            .first()
        )

    def get_by_client_id(self, client_id: str) -> OAuthClient | None:
        return (
            self.db.query(OAuthClient)
            .filter(OAuthClient.client_id == client_id)
            .first()
        )

    def list_clients(self) -> list[OAuthClient]:
        return (
            self.db.query(OAuthClient)
            .order_by(OAuthClient.created_at.desc())
            .all()
        )

    def create(self, client_data: dict) -> OAuthClient:
        db_client = OAuthClient(**client_data)
        self.db.add(db_client)
        self.db.commit()
        self.db.refresh(db_client)
        return db_client

    def update(self, client: OAuthClient, update_data: dict) -> OAuthClient:
        for field, value in update_data.items():
            setattr(client, field, value)
        self.db.commit()
        self.db.refresh(client)
        return client

    def delete(self, client: OAuthClient) -> None:
        self.db.delete(client)
        self.db.commit()
