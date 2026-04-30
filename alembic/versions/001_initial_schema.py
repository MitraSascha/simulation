"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- ENUMs via raw SQL mit IF NOT EXISTS ---
    op.execute("DO $$ BEGIN CREATE TYPE simulationstatus AS ENUM ('pending', 'running', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE platform AS ENUM ('feedbook', 'threadit'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE reactiontype AS ENUM ('like', 'dislike', 'share'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    # --- Tabellen in Abhängigkeits-Reihenfolge ---

    op.create_table(
        'simulations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.VARCHAR(255), nullable=False),
        sa.Column('product_description', sa.TEXT(), nullable=True),
        sa.Column('target_market', sa.VARCHAR(255), nullable=True),
        sa.Column('industry', sa.VARCHAR(255), nullable=True),
        sa.Column(
            'status',
            postgresql.ENUM('pending', 'running', 'completed', 'failed', name='simulationstatus', create_type=False),
            nullable=False,
            server_default='pending',
        ),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('current_tick', sa.INTEGER(), nullable=False, server_default='0'),
        sa.Column('total_ticks', sa.INTEGER(), nullable=False, server_default='15'),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
    )

    op.create_table(
        'personas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.VARCHAR(255), nullable=False),
        sa.Column('age', sa.VARCHAR(10), nullable=True),
        sa.Column('location', sa.VARCHAR(255), nullable=True),
        sa.Column('occupation', sa.VARCHAR(255), nullable=True),
        sa.Column('personality', sa.TEXT(), nullable=True),
        sa.Column('values', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('communication_style', sa.TEXT(), nullable=True),
        sa.Column('initial_opinion', sa.TEXT(), nullable=True),
        sa.Column('is_skeptic', sa.BOOLEAN(), nullable=False, server_default='false'),
        sa.Column('social_connections', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('current_state', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('extra', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(
            ['simulation_id'], ['simulations.id'],
            ondelete='CASCADE',
        ),
    )

    op.create_table(
        'posts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'platform',
            postgresql.ENUM('feedbook', 'threadit', name='platform', create_type=False),
            nullable=False,
        ),
        sa.Column('content', sa.TEXT(), nullable=False),
        sa.Column('ingame_day', sa.INTEGER(), nullable=True),
        sa.Column('subreddit', sa.VARCHAR(255), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(
            ['simulation_id'], ['simulations.id'],
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['author_id'], ['personas.id'],
            ondelete='CASCADE',
        ),
    )

    op.create_table(
        'comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.TEXT(), nullable=False),
        sa.Column('ingame_day', sa.INTEGER(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(
            ['post_id'], ['posts.id'],
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['author_id'], ['personas.id'],
            ondelete='CASCADE',
        ),
    )

    op.create_table(
        'reactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('post_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('persona_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'reaction_type',
            postgresql.ENUM('like', 'dislike', 'share', name='reactiontype', create_type=False),
            nullable=False,
        ),
        sa.Column('ingame_day', sa.INTEGER(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(
            ['post_id'], ['posts.id'],
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['persona_id'], ['personas.id'],
            ondelete='CASCADE',
        ),
    )

    op.create_table(
        'simulation_ticks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tick_number', sa.INTEGER(), nullable=False),
        sa.Column('ingame_day', sa.INTEGER(), nullable=True),
        sa.Column('snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(
            ['simulation_id'], ['simulations.id'],
            ondelete='CASCADE',
        ),
    )

    op.create_table(
        'analysis_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('simulation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sentiment_over_time', sa.TEXT(), nullable=True),
        sa.Column('key_turning_points', sa.TEXT(), nullable=True),
        sa.Column('criticism_points', sa.TEXT(), nullable=True),
        sa.Column('opportunities', sa.TEXT(), nullable=True),
        sa.Column('target_segment_analysis', sa.TEXT(), nullable=True),
        sa.Column('unexpected_findings', sa.TEXT(), nullable=True),
        sa.Column('full_report', sa.TEXT(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(
            ['simulation_id'], ['simulations.id'],
            ondelete='CASCADE',
        ),
    )

    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('key_hash', sa.VARCHAR(64), nullable=False),
        sa.Column('name', sa.VARCHAR(255), nullable=True),
        sa.Column('is_active', sa.BOOLEAN(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('last_used_at', sa.TIMESTAMP(), nullable=True),
        sa.UniqueConstraint('key_hash', name='uq_api_keys_key_hash'),
    )
    op.create_index('ix_api_keys_key_hash', 'api_keys', ['key_hash'], unique=True)


def downgrade() -> None:
    # Tabellen in umgekehrter Reihenfolge löschen
    op.drop_index('ix_api_keys_key_hash', table_name='api_keys')
    op.drop_table('api_keys')
    op.drop_table('analysis_reports')
    op.drop_table('simulation_ticks')
    op.drop_table('reactions')
    op.drop_table('comments')
    op.drop_table('posts')
    op.drop_table('personas')
    op.drop_table('simulations')
    # ENUMs löschen
    postgresql.ENUM(name='reactiontype').drop(op.get_bind())
    postgresql.ENUM(name='platform').drop(op.get_bind())
    postgresql.ENUM(name='simulationstatus').drop(op.get_bind())
