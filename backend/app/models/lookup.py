import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Cause(Base):
    """Lookup table for grant/client causes (e.g., Education, Healthcare, Environment)"""
    __tablename__ = "causes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<Cause {self.name}>"


class ApplicantType(Base):
    """Lookup table for who can apply (e.g., Registered Charity, Nonprofit, First Nations)"""
    __tablename__ = "applicant_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<ApplicantType {self.name}>"


class Province(Base):
    """Lookup table for Canadian provinces/territories"""
    __tablename__ = "provinces"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(2), unique=True, nullable=False)  # e.g., "BC", "ON"
    name = Column(String, nullable=False)
    country_code = Column(String(2), nullable=False, default="CA")
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<Province {self.code}>"


class EligibilityFlag(Base):
    """Optional flags like Indigenous-led, Women-led, Youth-led"""
    __tablename__ = "eligibility_flags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<EligibilityFlag {self.name}>"
