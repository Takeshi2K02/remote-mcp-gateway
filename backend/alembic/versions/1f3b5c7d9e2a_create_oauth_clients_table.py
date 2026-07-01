"""create oauth_clients table

Revision ID: 1f3b5c7d9e2a
Revises: 5de0920daac6
Create Date: 2026-06-30 11:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1f3b5c7d9e2a'
down_revision: Union[str, Sequence[str], None] = '5de0920daac6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'oauth_clients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.String(length=255), nullable=False),
        sa.Column('client_name', sa.String(length=255), nullable=False),
        sa.Column('client_secret_hash', sa.String(length=255), nullable=True),
        sa.Column('client_type', sa.String(length=50), nullable=False),
        sa.Column('redirect_uris', sa.JSON(), nullable=False),
        sa.Column('allowed_scopes', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oauth_clients_client_id'), 'oauth_clients', ['client_id'], unique=True)
    op.create_index(op.f('ix_oauth_clients_id'), 'oauth_clients', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_oauth_clients_id'), table_name='oauth_clients')
    op.drop_index(op.f('ix_oauth_clients_client_id'), table_name='oauth_clients')
    op.drop_table('oauth_clients')
