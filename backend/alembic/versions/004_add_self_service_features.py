"""Add self-service features: client_type and saved_grants

Revision ID: 004
Revises: 003
Create Date: 2026-01-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add client_type to clients table
    op.add_column('clients', sa.Column('client_type', sa.String(), nullable=True, server_default='managed'))
    
    # Update existing clients to be 'managed'
    op.execute("UPDATE clients SET client_type = 'managed' WHERE client_type IS NULL")
    
    # Create saved_grants table
    op.create_table(
        'saved_grants',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('client_id', UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('grant_id', UUID(as_uuid=True), sa.ForeignKey('grants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    
    # Create unique constraint to prevent duplicate saves
    op.create_unique_constraint('uq_saved_grants_client_grant', 'saved_grants', ['client_id', 'grant_id'])
    
    # Create index for faster lookups
    op.create_index('ix_saved_grants_client_id', 'saved_grants', ['client_id'])


def downgrade() -> None:
    # Drop saved_grants table
    op.drop_index('ix_saved_grants_client_id', table_name='saved_grants')
    op.drop_constraint('uq_saved_grants_client_grant', 'saved_grants', type_='unique')
    op.drop_table('saved_grants')
    
    # Remove client_type column
    op.drop_column('clients', 'client_type')
