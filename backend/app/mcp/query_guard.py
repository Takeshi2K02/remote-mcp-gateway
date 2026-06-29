import re


DANGEROUS_SQL_KEYWORDS = {
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "truncate",
    "create",
    "merge",
    "exec",
    "execute",
    "grant",
    "revoke",
}


class MCPQueryGuard:
    """
    Performs basic SQL safety checks before execution.

    This is intentionally conservative for now:
    only read-only SELECT queries are allowed.
    """

    def validate_read_only_query(self, query: str) -> None:
        normalized_query = self._normalize_query(query)

        if not normalized_query:
            raise ValueError("SQL query cannot be empty.")

        if not normalized_query.startswith("select"):
            raise ValueError("Only SELECT queries are allowed.")

        for keyword in DANGEROUS_SQL_KEYWORDS:
            if re.search(rf"\b{keyword}\b", normalized_query):
                raise ValueError(f"SQL keyword '{keyword}' is not allowed.")

    def extract_table_names(self, query: str) -> list[str]:
        """
        Naively extracts table names from FROM/JOIN clauses.

        TODO:
        Replace this with a real SQL parser before production use.
        """
        normalized_query = self._normalize_query(query)

        matches = re.findall(
            r"\b(?:from|join)\s+([a-zA-Z0-9_\.\[\]]+)",
            normalized_query,
        )

        return [match.strip("[]") for match in matches]

    def _normalize_query(self, query: str) -> str:
        # Remove extra whitespace and normalize casing.
        return " ".join(query.strip().lower().split())
    
    # ============================================================================
# TODO (Production)
#
# The current implementation uses regular expressions to extract table names
# from SQL queries. This is sufficient for early development but is not
# reliable for complex SQL (e.g., CTEs, subqueries, aliases, nested queries,
# quoted identifiers, functions, UNIONs, or database-specific syntax).
#
# Before production, replace this implementation with a proper SQL parser
# (e.g., sqlglot) and perform authorization using the parsed query tree.
# ============================================================================