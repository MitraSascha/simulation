"""add webhook_url to simulations

Revision ID: 003
Revises: 002
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('simulations', sa.Column('webhook_url', sa.String(2048), nullable=True))

def downgrade() -> None:
    op.drop_column('simulations', 'webhook_url')
