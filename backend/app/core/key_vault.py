from functools import lru_cache
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from app.core.config import get_settings


@lru_cache
def get_secret_client() -> SecretClient:
    settings = get_settings()

    return SecretClient(
        vault_url=settings.azure_key_vault_url,
        credential=DefaultAzureCredential(),
    )


def get_secret(secret_name: str) -> str:
    client = get_secret_client()
    secret = client.get_secret(secret_name)
    return secret.value