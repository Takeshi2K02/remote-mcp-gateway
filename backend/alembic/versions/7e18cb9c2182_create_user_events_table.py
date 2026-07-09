"""create_user_events_table

Revision ID: 7e18cb9c2182
Revises: 8a3aed3c75dc
Create Date: 2026-07-09 12:12:22.040583

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7e18cb9c2182'
down_revision: Union[str, Sequence[str], None] = '8a3aed3c75dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('user_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('event_type', sa.String(length=50), nullable=False),
    sa.Column('details', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_events_id'), 'user_events', ['id'], unique=False)
    op.create_index(op.f('ix_user_events_user_id'), 'user_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_events_event_type'), 'user_events', ['event_type'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_user_events_event_type'), table_name='user_events')
    op.drop_index(op.f('ix_user_events_user_id'), table_name='user_events')
    op.drop_index(op.f('ix_user_events_id'), table_name='user_events')
    op.drop_table('user_events')
