"""add influence analysis fields to analysis_reports

Revision ID: 005
Revises: 004
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('analysis_reports', sa.Column('influence_network', sa.Text, nullable=True))
    op.add_column('analysis_reports', sa.Column('platform_dynamics', sa.Text, nullable=True))
    op.add_column('analysis_reports', sa.Column('network_evolution', sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column('analysis_reports', 'network_evolution')
    op.drop_column('analysis_reports', 'platform_dynamics')
    op.drop_column('analysis_reports', 'influence_network')
