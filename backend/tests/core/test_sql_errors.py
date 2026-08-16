from sqlalchemy.exc import OperationalError

from app.core.sql_errors import classify_sql_connection_error


def make_operational_error(driver_message: str) -> OperationalError:
    return OperationalError("SELECT 1", {}, Exception(driver_message))


def test_classifies_login_timeout_as_connection_timeout():
    exc = make_operational_error(
        "('HYT00', '[HYT00] [Microsoft][ODBC Driver 18 for SQL Server]"
        "Login timeout expired (0) (SQLDriverConnect)')"
    )

    info = classify_sql_connection_error("MeridianRetailDW", exc)

    assert info.error_type == "connection_timeout"
    assert "MeridianRetailDW" in info.message
    assert "paused" in info.message.lower()


def test_classifies_tcp_reset_as_connection_reset():
    exc = make_operational_error(
        "('08S01', '[08S01] [Microsoft][ODBC Driver 18 for SQL Server]"
        "TCP Provider: Error code 0x68 (104) (SQLExecDirectW)')"
    )

    info = classify_sql_connection_error("MeridianRetailDW", exc)

    assert info.error_type == "connection_reset"
    assert "reset" in info.message.lower()
    assert "retry" in info.message.lower()


def test_classifies_login_failed_as_sql_authentication_error():
    exc = make_operational_error(
        "('28000', '[28000] [Microsoft][ODBC Driver 18 for SQL Server]"
        "Login failed for user \\'app_reader\\'.')"
    )

    info = classify_sql_connection_error("MeridianRetailDW", exc)

    assert info.error_type == "sql_authentication_error"



def test_classifies_unknown_error_as_generic_connection_error():
    exc = make_operational_error("some unrecognized driver failure")

    info = classify_sql_connection_error("MeridianRetailDW", exc)

    assert info.error_type == "connection_error"
