import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Date, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base
from app.models.associations import grant_causes, grant_applicant_types, grant_provinces, grant_eligibility_flags


class GrantStatus(str, enum.Enum):
    open = "open"
    closed = "closed"
    unknown = "unknown"


class DeadlineType(str, enum.Enum):
    fixed = "fixed"
    rolling = "rolling"
    multiple = "multiple"


class Grant(Base):
    """External grant opportunity"""
    __tablename__ = "grants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    funder = Column(String)  # Organization offering the grant
    description = Column(Text)
    source_url = Column(String)  # Link to grant page
    notes = Column(Text)
    
    # Status
    status = Column(SQLEnum(GrantStatus), nullable=False, default=GrantStatus.unknown)
    
    # Deadlines
    deadline_type = Column(SQLEnum(DeadlineType), nullable=False, default=DeadlineType.rolling)
    deadline_at = Column(Date)  # For fixed deadline
    next_deadline_at = Column(Date)  # For multiple rounds
    last_verified_at = Column(DateTime)
    
    # Funding amount
    amount_min = Column(Numeric(12, 2))
    amount_max = Column(Numeric(12, 2))
    currency = Column(String(3), nullable=False, default="CAD")
    
    # Audit
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", back_populates="created_grants", foreign_keys=[created_by_user_id])
    matches = relationship("Match", back_populates="grant")
    applications = relationship("Application", back_populates="grant")
    
    # Eligibility criteria (many-to-many)
    causes = relationship("Cause", secondary=grant_causes, lazy="selectin")
    applicant_types = relationship("ApplicantType", secondary=grant_applicant_types, lazy="selectin")
    provinces = relationship("Province", secondary=grant_provinces, lazy="selectin")
    eligibility_flags = relationship("EligibilityFlag", secondary=grant_eligibility_flags, lazy="selectin")
    
    def __repr__(self):
        return f"<Grant {self.name}>"
