import pytest
from app.mcp.query_rewriter import MCPQueryRewriter


def test_apply_row_limit_wraps_query():
    rewriter = MCPQueryRewriter()

    query = rewriter.apply_row_limit(
        query="SELECT id, name FROM customers",
        max_rows=100,
    )

    assert "SELECT TOP (:gateway_max_rows) *" in query
    assert "SELECT id, name FROM customers" in query
    assert "gateway_limited_query" in query


def test_apply_row_limit_removes_trailing_semicolon():
    rewriter = MCPQueryRewriter()

    query = rewriter.apply_row_limit(
        query="SELECT * FROM customers;",
        max_rows=100,
    )

    assert "customers;" not in query


def test_apply_row_limit_rejects_invalid_max_rows():
    rewriter = MCPQueryRewriter()

    with pytest.raises(ValueError, match="max_rows must be greater than 0"):
        rewriter.apply_row_limit(
            query="SELECT * FROM customers",
            max_rows=0,
        )