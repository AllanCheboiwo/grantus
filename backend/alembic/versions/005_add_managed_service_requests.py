"""Add managed_service_requests table

Revision ID: 005
Revises: 004
Create Date: 2026-01-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'managed_service_requests',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('client_id', UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('contact_phone', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_managed_service_requests_client_id', 'managed_service_requests', ['client_id'])
    op.create_index('ix_managed_service_requests_status', 'managed_service_requests', ['status'])


def downgrade() -> None:
    op.drop_index('ix_managed_service_requests_status', table_name='managed_service_requests')
    op.drop_index('ix_managed_service_requests_client_id', table_name='managed_service_requests')
    op.drop_table('managed_service_requests')
