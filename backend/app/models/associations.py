from sqlalchemy import Table, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

# Grant associations
grant_causes = Table(
    "grant_causes",
    Base.metadata,
    Column("grant_id", UUID(as_uuid=True), ForeignKey("grants.id", ondelete="CASCADE"), primary_key=True),
    Column("cause_id", UUID(as_uuid=True), ForeignKey("causes.id"), primary_key=True)
)

grant_applicant_types = Table(
    "grant_applicant_types",
    Base.metadata,
    Column("grant_id", UUID(as_uuid=True), ForeignKey("grants.id", ondelete="CASCADE"), primary_key=True),
    Column("applicant_type_id", UUID(as_uuid=True), ForeignKey("applicant_types.id"), primary_key=True)
)

grant_provinces = Table(
    "grant_provinces",
    Base.metadata,
    Column("grant_id", UUID(as_uuid=True), ForeignKey("grants.id", ondelete="CASCADE"), primary_key=True),
    Column("province_id", UUID(as_uuid=True), ForeignKey("provinces.id"), primary_key=True)
)

grant_eligibility_flags = Table(
    "grant_eligibility_flags",
    Base.metadata,
    Column("grant_id", UUID(as_uuid=True), ForeignKey("grants.id", ondelete="CASCADE"), primary_key=True),
    Column("flag_id", UUID(as_uuid=True), ForeignKey("eligibility_flags.id"), primary_key=True)
)

# Client associations
client_causes = Table(
    "client_causes",
    Base.metadata,
    Column("client_id", UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True),
    Column("cause_id", UUID(as_uuid=True), ForeignKey("causes.id"), primary_key=True)
)

client_applicant_types = Table(
    "client_applicant_types",
    Base.metadata,
    Column("client_id", UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True),
    Column("applicant_type_id", UUID(as_uuid=True), ForeignKey("applicant_types.id"), primary_key=True)
)

client_provinces = Table(
    "client_provinces",
    Base.metadata,
    Column("client_id", UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True),
    Column("province_id", UUID(as_uuid=True), ForeignKey("provinces.id"), primary_key=True)
)

client_eligibility_flags = Table(
    "client_eligibility_flags",
    Base.metadata,
    Column("client_id", UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True),
    Column("flag_id", UUID(as_uuid=True), ForeignKey("eligibility_flags.id"), primary_key=True)
)
