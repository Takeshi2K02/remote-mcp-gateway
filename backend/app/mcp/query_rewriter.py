import re


class MCPQueryRewriter:
    """Applies safe query transformations before execution."""

    def apply_row_limit(
        self,
        query: str,
        max_rows: int,
    ) -> str:
        """
        Wrap the user query and limit returned rows at the database level.
        """

        cleaned_query = query.strip().rstrip(";")

        if max_rows <= 0:
            raise ValueError("max_rows must be greater than 0.")

        return (
            "SELECT TOP (:gateway_max_rows) * "
            "FROM ("
            f"{cleaned_query}"
            ") AS gateway_limited_query"
        )

    def has_existing_top_clause(self, query: str) -> bool:
        """Detect simple SELECT TOP usage."""
        return bool(
            re.match(
                r"^\s*select\s+top\s*\(",
                query,
                flags=re.IGNORECASE,
            )
        )