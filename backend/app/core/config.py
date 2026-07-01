from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Remote MCP Gateway", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")

    frontend_base_url: str = Field(
        default="http://localhost:3000",
        alias="FRONTEND_BASE_URL",
    )

    entra_tenant_id: str = Field(alias="ENTRA_TENANT_ID")
    entra_client_id: str = Field(alias="ENTRA_CLIENT_ID")
    entra_client_secret: str = Field(alias="ENTRA_CLIENT_SECRET")

    db_host: str = Field(alias="DB_HOST")
    db_port: int = Field(default=1433, alias="DB_PORT")
    db_name: str = Field(alias="DB_NAME")
    db_username: str = Field(alias="DB_USERNAME")
    db_password: str = Field(alias="DB_PASSWORD")
    db_driver: str = Field(alias="DB_DRIVER")

    azure_key_vault_url: str = Field(alias="AZURE_KEY_VAULT_URL")

    sql_query_timeout_seconds: int = Field(
        default=30,
        alias="SQL_QUERY_TIMEOUT_SECONDS",
    )

    sql_max_rows: int = Field(
        default=1000,
        alias="SQL_MAX_ROWS",
    )

    secret_key: str = Field(alias="SECRET_KEY")

    app_jwt_secret_key: str = Field(alias="APP_JWT_SECRET_KEY")
    app_jwt_algorithm: str = Field(default="HS256", alias="APP_JWT_ALGORITHM")
    app_jwt_expire_minutes: int = Field(
        default=60,
        alias="APP_JWT_EXPIRE_MINUTES",
    )

    backend_base_url: str = Field(
        default="http://localhost:8000",
        alias="BACKEND_BASE_URL",
    )

    oauth_issuer: str = Field(
        default="https://login.microsoftonline.com/2df94db0-c007-4150-be2c-594992121866/v2.0",
        alias="OAUTH_ISSUER",
    )

    mcp_endpoint_url: str = Field(
        default="http://localhost:8000/mcp",
        alias="MCP_ENDPOINT_URL",
    )

    mcp_allowed_hosts: str = Field(
        default="localhost,localhost:8000,127.0.0.1,127.0.0.1:8000,backend-gateway.gentleforest-38e3a42b.southeastasia.azurecontainerapps.io",
        alias="MCP_ALLOWED_HOSTS",
    )

    mcp_allowed_origins: str = Field(
        default="http://localhost:3000,https://claude.ai",
        alias="MCP_ALLOWED_ORIGINS",
    )

    mcp_enable_dns_rebinding_protection: bool = Field(
        default=True,
        alias="MCP_ENABLE_DNS_REBINDING_PROTECTION",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()