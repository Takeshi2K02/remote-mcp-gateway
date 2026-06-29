"""extend sql servers for connection metadata

Revision ID: d72229598903
Revises: 51eb2ff3b573
Create Date: 2026-06-29 08:29:38.338370
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d72229598903"
down_revision: Union[str, Sequence[str], None] = "51eb2ff3b573"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "sql_servers",
        sa.Column(
            "authentication_type",
            sa.String(length=50),
            nullable=False,
            server_default="sql_password",
        ),
    )

    op.add_column(
        "sql_servers",
        sa.Column(
            "username",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "sql_servers",
        sa.Column(
            "secret_reference",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "sql_servers",
        sa.Column(
            "connection_options",
            sa.String(length=1000),
            nullable=True,
        ),
    )

    # Remove the default after existing rows have been populated.
    op.alter_column(
        "sql_servers",
        "authentication_type",
        server_default=None,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column("sql_servers", "connection_options")
    op.drop_column("sql_servers", "secret_reference")
    op.drop_column("sql_servers", "username")
    op.drop_column("sql_servers", "authentication_type")