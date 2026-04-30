"""performance indexes on FK columns

Revision ID: 002
Revises: 001
Create Date: 2026-04-29

"""
from alembic import op

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_personas_simulation_id", "personas", ["simulation_id"])
    op.create_index("ix_posts_simulation_id", "posts", ["simulation_id"])
    op.create_index("ix_posts_ingame_day", "posts", ["ingame_day"])
    op.create_index("ix_posts_platform", "posts", ["platform"])
    op.create_index("ix_comments_post_id", "comments", ["post_id"])
    op.create_index("ix_reactions_post_id", "reactions", ["post_id"])
    op.create_index("ix_simulation_ticks_simulation_id", "simulation_ticks", ["simulation_id"])
    op.create_index("ix_analysis_reports_simulation_id", "analysis_reports", ["simulation_id"])
    op.create_index("ix_simulations_status", "simulations", ["status"])
    op.create_index("ix_simulations_created_at", "simulations", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_simulations_created_at", "simulations")
    op.drop_index("ix_simulations_status", "simulations")
    op.drop_index("ix_analysis_reports_simulation_id", "analysis_reports")
    op.drop_index("ix_simulation_ticks_simulation_id", "simulation_ticks")
    op.drop_index("ix_reactions_post_id", "reactions")
    op.drop_index("ix_comments_post_id", "comments")
    op.drop_index("ix_posts_platform", "posts")
    op.drop_index("ix_posts_ingame_day", "posts")
    op.drop_index("ix_posts_simulation_id", "posts")
    op.drop_index("ix_personas_simulation_id", "personas")
