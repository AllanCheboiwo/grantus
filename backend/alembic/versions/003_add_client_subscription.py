"""Add subscription fields to clients table

Revision ID: 003
Revises: 002
Create Date: 2026-01-26

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add subscription fields to clients table
    op.add_column('clients', sa.Column('stripe_customer_id', sa.String(), nullable=True))
    op.add_column('clients', sa.Column('subscription_id', sa.String(), nullable=True))
    op.add_column('clients', sa.Column('subscription_status', sa.String(), nullable=True))
    op.add_column('clients', sa.Column('subscription_price_id', sa.String(), nullable=True))
    op.add_column('clients', sa.Column('current_period_end', sa.DateTime(), nullable=True))
    op.add_column('clients', sa.Column('grant_db_access', sa.Boolean(), nullable=True, server_default='false'))
    
    # Create index on stripe_customer_id for faster lookups
    op.create_index('ix_clients_stripe_customer_id', 'clients', ['stripe_customer_id'], unique=True)


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_clients_stripe_customer_id', table_name='clients')
    
    # Remove subscription columns
    op.drop_column('clients', 'grant_db_access')
    op.drop_column('clients', 'current_period_end')
    op.drop_column('clients', 'subscription_price_id')
    op.drop_column('clients', 'subscription_status')
    op.drop_column('clients', 'subscription_id')
    op.drop_column('clients', 'stripe_customer_id')
