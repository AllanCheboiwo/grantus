"""Add client invites table

Revision ID: 002
Revises: 001_initial_schema
Create Date: 2026-01-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = '002'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'client_invites',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('client_id', UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('client_role', sa.String(), default='viewer'),
        sa.Column('token', sa.String(), unique=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_by_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    
    # Index for fast token lookups
    op.create_index('ix_client_invites_token', 'client_invites', ['token'])
    op.create_index('ix_client_invites_email', 'client_invites', ['email'])


def downgrade() -> None:
    op.drop_index('ix_client_invites_email')
    op.drop_index('ix_client_invites_token')
    op.drop_table('client_invites')
