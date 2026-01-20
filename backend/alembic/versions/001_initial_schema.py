"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-01-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    user_role = postgresql.ENUM('admin', 'staff', 'client', name='userrole', create_type=False)
    user_role.create(op.get_bind(), checkfirst=True)
    
    grant_status = postgresql.ENUM('open', 'closed', 'unknown', name='grantstatus', create_type=False)
    grant_status.create(op.get_bind(), checkfirst=True)
    
    deadline_type = postgresql.ENUM('fixed', 'rolling', 'multiple', name='deadlinetype', create_type=False)
    deadline_type.create(op.get_bind(), checkfirst=True)
    
    match_status = postgresql.ENUM('new', 'qualified', 'rejected', 'converted', name='matchstatus', create_type=False)
    match_status.create(op.get_bind(), checkfirst=True)
    
    application_stage = postgresql.ENUM('draft', 'in_progress', 'submitted', 'awarded', 'declined', 'reporting', 'closed', name='applicationstage', create_type=False)
    application_stage.create(op.get_bind(), checkfirst=True)
    
    event_type = postgresql.ENUM('status_change', 'note', 'doc_request', 'submission', 'decision', name='eventtype', create_type=False)
    event_type.create(op.get_bind(), checkfirst=True)
    
    message_channel = postgresql.ENUM('email', 'portal', name='messagechannel', create_type=False)
    message_channel.create(op.get_bind(), checkfirst=True)

    # Users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('role', sa.Enum('admin', 'staff', 'client', name='userrole'), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Lookup tables
    op.create_table('causes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('applicant_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table('provinces',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(2), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('country_code', sa.String(2), nullable=False, default='CA'),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )

    op.create_table('eligibility_flags',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Clients table
    op.create_table('clients',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Client users junction
    op.create_table('client_users',
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_role', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('client_id', 'user_id')
    )

    # Grants table
    op.create_table('grants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('funder', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('source_url', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('open', 'closed', 'unknown', name='grantstatus'), nullable=False),
        sa.Column('deadline_type', sa.Enum('fixed', 'rolling', 'multiple', name='deadlinetype'), nullable=False),
        sa.Column('deadline_at', sa.Date(), nullable=True),
        sa.Column('next_deadline_at', sa.Date(), nullable=True),
        sa.Column('last_verified_at', sa.DateTime(), nullable=True),
        sa.Column('amount_min', sa.Numeric(12, 2), nullable=True),
        sa.Column('amount_max', sa.Numeric(12, 2), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False, default='CAD'),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_grants_status', 'grants', ['status'])
    op.create_index('ix_grants_deadline_at', 'grants', ['deadline_at'])

    # Grant association tables
    op.create_table('grant_causes',
        sa.Column('grant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cause_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['grant_id'], ['grants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cause_id'], ['causes.id']),
        sa.PrimaryKeyConstraint('grant_id', 'cause_id')
    )

    op.create_table('grant_applicant_types',
        sa.Column('grant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('applicant_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['grant_id'], ['grants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['applicant_type_id'], ['applicant_types.id']),
        sa.PrimaryKeyConstraint('grant_id', 'applicant_type_id')
    )

    op.create_table('grant_provinces',
        sa.Column('grant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('province_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['grant_id'], ['grants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['province_id'], ['provinces.id']),
        sa.PrimaryKeyConstraint('grant_id', 'province_id')
    )

    op.create_table('grant_eligibility_flags',
        sa.Column('grant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('flag_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['grant_id'], ['grants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['flag_id'], ['eligibility_flags.id']),
        sa.PrimaryKeyConstraint('grant_id', 'flag_id')
    )

    # Client association tables
    op.create_table('client_causes',
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cause_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cause_id'], ['causes.id']),
        sa.PrimaryKeyConstraint('client_id', 'cause_id')
    )

    op.create_table('client_applicant_types',
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('applicant_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['applicant_type_id'], ['applicant_types.id']),
        sa.PrimaryKeyConstraint('client_id', 'applicant_type_id')
    )

    op.create_table('client_provinces',
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('province_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['province_id'], ['provinces.id']),
        sa.PrimaryKeyConstraint('client_id', 'province_id')
    )

    op.create_table('client_eligibility_flags',
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('flag_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['flag_id'], ['eligibility_flags.id']),
        sa.PrimaryKeyConstraint('client_id', 'flag_id')
    )

    # Matches table
    op.create_table('matches',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('grant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fit_score', sa.Integer(), nullable=False, default=0),
        sa.Column('fit_level', sa.String(), nullable=True),
        sa.Column('reasons', postgresql.JSONB(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('new', 'qualified', 'rejected', 'converted', name='matchstatus'), nullable=False),
        sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['grant_id'], ['grants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('client_id', 'grant_id', name='unique_match_per_client_grant')
    )
    op.create_index('ix_matches_client_id', 'matches', ['client_id'])
    op.create_index('ix_matches_grant_id', 'matches', ['grant_id'])
    op.create_index('ix_matches_status', 'matches', ['status'])

    # Applications table
    op.create_table('applications',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('grant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('match_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stage', sa.Enum('draft', 'in_progress', 'submitted', 'awarded', 'declined', 'reporting', 'closed', name='applicationstage'), nullable=False),
        sa.Column('internal_deadline_at', sa.Date(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('decision_at', sa.DateTime(), nullable=True),
        sa.Column('amount_requested', sa.Numeric(12, 2), nullable=True),
        sa.Column('amount_awarded', sa.Numeric(12, 2), nullable=True),
        sa.Column('assigned_to_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('cycle_year', sa.Integer(), nullable=True),
        sa.Column('round_label', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['grant_id'], ['grants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['match_id'], ['matches.id']),
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_applications_client_id', 'applications', ['client_id'])
    op.create_index('ix_applications_grant_id', 'applications', ['grant_id'])
    op.create_index('ix_applications_stage', 'applications', ['stage'])

    # Application events table
    op.create_table('application_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.Enum('status_change', 'note', 'doc_request', 'submission', 'decision', name='eventtype'), nullable=False),
        sa.Column('from_stage', sa.String(), nullable=True),
        sa.Column('to_stage', sa.String(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_application_events_application_id', 'application_events', ['application_id', 'created_at'])

    # Messages table
    op.create_table('messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('channel', sa.Enum('email', 'portal', name='messagechannel'), nullable=False),
        sa.Column('subject', sa.String(), nullable=True),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('sent_to', sa.String(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id']),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_messages_client_id', 'messages', ['client_id', 'sent_at'])


def downgrade() -> None:
    op.drop_table('messages')
    op.drop_table('application_events')
    op.drop_table('applications')
    op.drop_table('matches')
    op.drop_table('client_eligibility_flags')
    op.drop_table('client_provinces')
    op.drop_table('client_applicant_types')
    op.drop_table('client_causes')
    op.drop_table('grant_eligibility_flags')
    op.drop_table('grant_provinces')
    op.drop_table('grant_applicant_types')
    op.drop_table('grant_causes')
    op.drop_table('grants')
    op.drop_table('client_users')
    op.drop_table('clients')
    op.drop_table('eligibility_flags')
    op.drop_table('provinces')
    op.drop_table('applicant_types')
    op.drop_table('causes')
    op.drop_table('users')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS messagechannel')
    op.execute('DROP TYPE IF EXISTS eventtype')
    op.execute('DROP TYPE IF EXISTS applicationstage')
    op.execute('DROP TYPE IF EXISTS matchstatus')
    op.execute('DROP TYPE IF EXISTS deadlinetype')
    op.execute('DROP TYPE IF EXISTS grantstatus')
    op.execute('DROP TYPE IF EXISTS userrole')
