import pytest
from app.mcp.query_guard import MCPQueryGuard


def test_select_query_is_allowed():
    guard = MCPQueryGuard()

    guard.validate_read_only_query("SELECT * FROM customers")


def test_empty_query_is_rejected():
    guard = MCPQueryGuard()

    with pytest.raises(ValueError, match="SQL query cannot be empty"):
        guard.validate_read_only_query("   ")


def test_non_select_query_is_rejected():
    guard = MCPQueryGuard()

    with pytest.raises(ValueError, match="Only SELECT queries are allowed"):
        guard.validate_read_only_query("UPDATE customers SET name = 'John'")


def test_dangerous_keyword_is_rejected():
    guard = MCPQueryGuard()

    with pytest.raises(ValueError, match="not allowed"):
        guard.validate_read_only_query("SELECT * FROM customers; DROP TABLE users")


def test_extract_table_names_from_from_and_join():
    guard = MCPQueryGuard()

    tables = guard.extract_table_names(
        "SELECT * FROM customers JOIN orders ON customers.id = orders.customer_id"
    )

    assert tables == ["customers", "orders"]