import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.associations import client_causes, client_applicant_types, client_provinces, client_eligibility_flags


class Client(Base):
    """Client organization (nonprofit, charity, etc.)"""
    __tablename__ = "clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    entity_type = Column(String)  # charity, nonprofit, business, etc.
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("ClientUser", back_populates="client")
    matches = relationship("Match", back_populates="client")
    applications = relationship("Application", back_populates="client")
    messages = relationship("Message", back_populates="client")
    
    # Eligibility profile (many-to-many)
    causes = relationship("Cause", secondary=client_causes, lazy="selectin")
    applicant_types = relationship("ApplicantType", secondary=client_applicant_types, lazy="selectin")
    provinces = relationship("Province", secondary=client_provinces, lazy="selectin")
    eligibility_flags = relationship("EligibilityFlag", secondary=client_eligibility_flags, lazy="selectin")
    
    def __repr__(self):
        return f"<Client {self.name}>"


class ClientUser(Base):
    """Junction table for users belonging to client organizations"""
    __tablename__ = "client_users"
    
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    client_role = Column(String)  # owner, viewer, etc.
    
    # Relationships
    client = relationship("Client", back_populates="users")
    user = relationship("User", back_populates="client_memberships")
