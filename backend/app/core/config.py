from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Remote MCP Gateway", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")

    db_host: str = Field(alias="DB_HOST")
    db_port: int = Field(default=1433, alias="DB_PORT")
    db_name: str = Field(alias="DB_NAME")
    db_username: str = Field(alias="DB_USERNAME")
    db_password: str = Field(alias="DB_PASSWORD")
    db_driver: str = Field(alias="DB_DRIVER")

    secret_key: str = Field(alias="SECRET_KEY")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()