"""add influence_events table

Revision ID: 004
Revises: 003
Create Date: 2026-04-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'influence_events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', UUID(as_uuid=True), sa.ForeignKey('simulations.id'), nullable=False),
        sa.Column('source_persona_id', UUID(as_uuid=True), sa.ForeignKey('personas.id'), nullable=False),
        sa.Column('target_persona_id', UUID(as_uuid=True), sa.ForeignKey('personas.id'), nullable=False),
        sa.Column('trigger_post_id', UUID(as_uuid=True), sa.ForeignKey('posts.id'), nullable=True),
        sa.Column('ingame_day', sa.Integer, nullable=False),
        sa.Column('influence_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_influence_events_simulation_id', 'influence_events', ['simulation_id'])
    op.create_index('ix_influence_events_target_persona_id', 'influence_events', ['target_persona_id'])
    op.create_index('ix_influence_events_ingame_day', 'influence_events', ['ingame_day'])

def downgrade() -> None:
    op.drop_table('influence_events')
