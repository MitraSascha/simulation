"""add llm_provider to simulations

Revision ID: 006
Revises: 005
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'simulations',
        sa.Column(
            'llm_provider',
            sa.String(32),
            nullable=False,
            server_default='anthropic',
        ),
    )


def downgrade() -> None:
    op.drop_column('simulations', 'llm_provider')
