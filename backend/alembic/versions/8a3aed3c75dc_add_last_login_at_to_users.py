"""add_last_login_at_to_users

Revision ID: 8a3aed3c75dc
Revises: 6b5b1d799579
Create Date: 2026-07-09 12:12:21.172063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a3aed3c75dc'
down_revision: Union[str, Sequence[str], None] = '6b5b1d799579'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'last_login_at')
