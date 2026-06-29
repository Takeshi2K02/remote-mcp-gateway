from sqlalchemy.engine import Engine


class SQLSessionCache:
    """Caches SQLAlchemy engines so we do not recreate them every request."""

    def __init__(self) -> None:
        self._engines: dict[str, Engine] = {}

    def get(self, key: str) -> Engine | None:
        return self._engines.get(key)

    def set(self, key: str, engine: Engine) -> None:
        self._engines[key] = engine

    def remove(self, key: str) -> None:
        engine = self._engines.pop(key, None)

        if engine:
            engine.dispose()

    def clear(self) -> None:
        for engine in self._engines.values():
            engine.dispose()

        self._engines.clear()