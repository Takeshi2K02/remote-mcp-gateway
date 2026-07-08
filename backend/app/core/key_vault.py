import re
from functools import lru_cache
from azure.core.exceptions import (
    AzureError,
    ClientAuthenticationError,
    ResourceNotFoundError,
)
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from app.core.config import get_settings

# Matches a Key Vault secret identifier URI, e.g. the "Secret Identifier"
# copied from the Azure Portal:
# https://{vault}.vault.azure.net/secrets/{name}[/{version}]
_SECRET_URI_RE = re.compile(r"^https://[^/]+\.vault\.azure\.net/secrets/([^/]+)")


class SecretResolutionError(RuntimeError):
    """Raised when a Key Vault secret cannot be resolved."""


@lru_cache
def get_secret_client() -> SecretClient:
    settings = get_settings()

    return SecretClient(
        vault_url=settings.azure_key_vault_url,
        credential=DefaultAzureCredential(),
    )


def _normalize_secret_name(secret_reference: str) -> str:
    """
    Accept either a bare secret name or a full Key Vault secret identifier
    URI (as copied from the Azure Portal) and return just the secret name
    the Key Vault SDK expects.
    """
    match = _SECRET_URI_RE.match(secret_reference.strip())
    if match:
        return match.group(1)
    return secret_reference.strip()


def get_secret(secret_name: str) -> str:
    normalized = _normalize_secret_name(secret_name)
    client = get_secret_client()

    try:
        secret = client.get_secret(normalized)
    except ResourceNotFoundError as exc:
        raise SecretResolutionError(
            f"Key Vault secret '{normalized}' was not found in the vault. "
            "Verify the secret reference matches the secret's name exactly."
        ) from exc
    except ClientAuthenticationError as exc:
        raise SecretResolutionError(
            "Key Vault authentication failed. Verify the application's "
            "managed identity has been granted the 'Key Vault Secrets User' "
            "role on the vault."
        ) from exc
    except AzureError as exc:
        raise SecretResolutionError(
            f"Key Vault secret resolution failed for '{normalized}': {exc}"
        ) from exc

    return secret.value