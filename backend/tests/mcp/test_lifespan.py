import contextlib
import pytest
from unittest.mock import patch, MagicMock

import app.mcp.transport.lifespan as lifespan_module
from app.mcp.transport.lifespan import mcp_lifespan


class FakeSessionManager:
    _has_started = False

    @contextlib.asynccontextmanager
    async def run(self):
        yield


@pytest.fixture(autouse=True)
def fake_session_manager(monkeypatch):
    monkeypatch.setattr(lifespan_module, "session_manager", FakeSessionManager())


def _fake_settings(auto_migrate: bool):
    settings = MagicMock()
    settings.auto_migrate_on_startup = auto_migrate
    return settings


@pytest.mark.anyio
async def test_lifespan_skips_migration_when_flag_disabled(monkeypatch):
    monkeypatch.setattr(lifespan_module, "get_settings", lambda: _fake_settings(False))

    with patch("alembic.command.upgrade") as mock_upgrade:
        async with mcp_lifespan(app=None):
            pass

    mock_upgrade.assert_not_called()


@pytest.mark.anyio
async def test_lifespan_runs_migration_when_flag_enabled(monkeypatch, tmp_path):
    monkeypatch.setattr(lifespan_module, "get_settings", lambda: _fake_settings(True))
    ini_path = tmp_path / "alembic.ini"
    ini_path.write_text("[alembic]\n")
    monkeypatch.chdir(tmp_path)

    with patch("alembic.command.upgrade") as mock_upgrade:
        async with mcp_lifespan(app=None):
            pass

    mock_upgrade.assert_called_once()
    assert mock_upgrade.call_args[0][1] == "head"


@pytest.mark.anyio
async def test_lifespan_propagates_migration_failure_instead_of_swallowing(monkeypatch, tmp_path):
    """
    Regression test: the old implementation caught any migration exception
    and just logged it, letting the app start anyway against a
    partially-migrated schema. A failure must now stop startup entirely.
    """
    monkeypatch.setattr(lifespan_module, "get_settings", lambda: _fake_settings(True))
    ini_path = tmp_path / "alembic.ini"
    ini_path.write_text("[alembic]\n")
    monkeypatch.chdir(tmp_path)

    with patch("alembic.command.upgrade", side_effect=RuntimeError("migration exploded")):
        with pytest.raises(RuntimeError, match="migration exploded"):
            async with mcp_lifespan(app=None):
                pass


@pytest.mark.anyio
async def test_lifespan_raises_when_flag_enabled_but_alembic_ini_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(lifespan_module, "get_settings", lambda: _fake_settings(True))
    monkeypatch.chdir(tmp_path)  # no alembic.ini here

    with pytest.raises(RuntimeError, match="alembic.ini was not found"):
        async with mcp_lifespan(app=None):
            pass
