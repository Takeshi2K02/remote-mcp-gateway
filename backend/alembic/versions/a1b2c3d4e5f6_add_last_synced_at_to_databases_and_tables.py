"""add_last_synced_at_to_databases_and_tables

Revision ID: a1b2c3d4e5f6
Revises: 51eb2ff3b573
Create Date: 2026-07-01 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'fc2c4b57492c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add last_synced_at to databases and database_tables."""
    op.add_column(
        'databases',
        sa.Column(
            'last_synced_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        'database_tables',
        sa.Column(
            'last_synced_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove last_synced_at from databases and database_tables."""
    op.drop_column('database_tables', 'last_synced_at')
    op.drop_column('databases', 'last_synced_at')
