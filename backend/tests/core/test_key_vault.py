import pytest
from azure.core.exceptions import (
    ClientAuthenticationError,
    HttpResponseError,
    ResourceNotFoundError,
)

from app.core import key_vault
from app.core.key_vault import SecretResolutionError, _normalize_secret_name, get_secret


def test_normalize_secret_name_accepts_bare_name():
    assert _normalize_secret_name("db-prod-password") == "db-prod-password"


def test_normalize_secret_name_extracts_name_from_full_uri():
    uri = (
        "https://rmgw-kv-takeshi.vault.azure.net/secrets/"
        "meridianretail-sql-app-password/6e52aeef8bbe412dbd629b0b174c8ec9"
    )
    assert _normalize_secret_name(uri) == "meridianretail-sql-app-password"


def test_normalize_secret_name_extracts_name_from_uri_without_version():
    uri = "https://rmgw-kv-takeshi.vault.azure.net/secrets/db-prod-password"
    assert _normalize_secret_name(uri) == "db-prod-password"


class _FakeSecret:
    def __init__(self, value: str):
        self.value = value


class _FakeClient:
    def __init__(self, exc: Exception | None = None, value: str = "hunter2"):
        self._exc = exc
        self._value = value
        self.requested_name: str | None = None

    def get_secret(self, name: str):
        self.requested_name = name
        if self._exc:
            raise self._exc
        return _FakeSecret(self._value)


def test_get_secret_returns_value_and_normalizes_uri(monkeypatch):
    client = _FakeClient(value="s3cr3t")
    monkeypatch.setattr(key_vault, "get_secret_client", lambda: client)

    uri = "https://rmgw-kv-takeshi.vault.azure.net/secrets/db-prod-password/v1"
    result = get_secret(uri)

    assert result == "s3cr3t"
    assert client.requested_name == "db-prod-password"


def test_get_secret_raises_secret_resolution_error_on_not_found(monkeypatch):
    client = _FakeClient(exc=ResourceNotFoundError("not found"))
    monkeypatch.setattr(key_vault, "get_secret_client", lambda: client)

    with pytest.raises(SecretResolutionError, match="was not found"):
        get_secret("missing-secret")


def test_get_secret_raises_secret_resolution_error_on_auth_failure(monkeypatch):
    client = _FakeClient(exc=ClientAuthenticationError("denied"))
    monkeypatch.setattr(key_vault, "get_secret_client", lambda: client)

    with pytest.raises(SecretResolutionError, match="managed identity"):
        get_secret("some-secret")


def test_get_secret_raises_secret_resolution_error_on_generic_azure_error(monkeypatch):
    client = _FakeClient(exc=HttpResponseError("bad request"))
    monkeypatch.setattr(key_vault, "get_secret_client", lambda: client)

    with pytest.raises(SecretResolutionError, match="secret resolution failed"):
        get_secret("some-secret")
