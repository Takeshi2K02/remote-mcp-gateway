import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.exceptions import unhandled_exception_handler


def make_app() -> FastAPI:
    app = FastAPI()
    app.add_exception_handler(Exception, unhandled_exception_handler)

    @app.get("/boom")
    def boom():
        raise RuntimeError("something went wrong deep in the stack")

    @app.get("/ok")
    def ok():
        return {"status": "fine"}

    return app


def test_unhandled_exception_returns_structured_body_with_correlation_id():
    client = TestClient(make_app(), raise_server_exceptions=False)

    response = client.get("/boom")

    assert response.status_code == 500
    body = response.json()
    assert body["error"] == "internal_server_error"
    assert "correlation_id" in body
    assert len(body["correlation_id"]) > 0
    assert "message" in body
    # The raw exception text must never leak to the caller.
    assert "something went wrong deep in the stack" not in response.text


def test_unhandled_exception_produces_unique_correlation_ids():
    client = TestClient(make_app(), raise_server_exceptions=False)

    first = client.get("/boom").json()["correlation_id"]
    second = client.get("/boom").json()["correlation_id"]

    assert first != second


def test_unhandled_exception_logs_full_traceback(caplog):
    client = TestClient(make_app(), raise_server_exceptions=False)

    with caplog.at_level(logging.ERROR, logger="app.core.exceptions"):
        response = client.get("/boom")

    correlation_id = response.json()["correlation_id"]
    assert any(correlation_id in record.message for record in caplog.records)
    assert any(record.exc_info for record in caplog.records)


def test_healthy_route_is_unaffected():
    client = TestClient(make_app())

    response = client.get("/ok")

    assert response.status_code == 200
    assert response.json() == {"status": "fine"}
