"""create oauth_authorization_codes table

Revision ID: fc2c4b57492c
Revises: 1f3b5c7d9e2a
Create Date: 2026-06-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fc2c4b57492c'
down_revision: Union[str, Sequence[str], None] = '1f3b5c7d9e2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'oauth_authorization_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=255), nullable=False),
        sa.Column('client_id', sa.String(length=255), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('redirect_uri', sa.String(length=2048), nullable=False),
        sa.Column('code_challenge', sa.String(length=255), nullable=False),
        sa.Column('code_challenge_method', sa.String(length=50), nullable=False),
        sa.Column('scopes', sa.JSON(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('consumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oauth_authorization_codes_code'), 'oauth_authorization_codes', ['code'], unique=True)
    op.create_index(op.f('ix_oauth_authorization_codes_id'), 'oauth_authorization_codes', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_oauth_authorization_codes_id'), table_name='oauth_authorization_codes')
    op.drop_index(op.f('ix_oauth_authorization_codes_code'), table_name='oauth_authorization_codes')
    op.drop_table('oauth_authorization_codes')
