from sqlalchemy.orm import Session
from app.models.oauth_authorization_code import OAuthAuthorizationCode


class OAuthAuthorizationCodeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_code(self, code: str) -> OAuthAuthorizationCode | None:
        return (
            self.db.query(OAuthAuthorizationCode)
            .filter(OAuthAuthorizationCode.code == code)
            .first()
        )

    def create(self, code_data: dict) -> OAuthAuthorizationCode:
        db_code = OAuthAuthorizationCode(**code_data)
        self.db.add(db_code)
        self.db.commit()
        self.db.refresh(db_code)
        return db_code

    def update(
        self,
        code: OAuthAuthorizationCode,
        update_data: dict,
    ) -> OAuthAuthorizationCode:
        for field, value in update_data.items():
            setattr(code, field, value)
        self.db.commit()
        self.db.refresh(code)
        return code
