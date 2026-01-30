import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
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
    client_type = Column(String, default="managed")  # managed, self_service
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Subscription fields for grant database access
    stripe_customer_id = Column(String, nullable=True)
    subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, nullable=True)  # active, canceled, past_due
    subscription_price_id = Column(String, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    grant_db_access = Column(Boolean, default=False)  # Manual override by staff
    
    # Relationships
    users = relationship("ClientUser", back_populates="client")
    matches = relationship("Match", back_populates="client")
    applications = relationship("Application", back_populates="client")
    messages = relationship("Message", back_populates="client")
    saved_grants = relationship("SavedGrant", back_populates="client", cascade="all, delete-orphan")
    managed_service_requests = relationship("ManagedServiceRequest", back_populates="client", cascade="all, delete-orphan")

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


class SavedGrant(Base):
    """Grants saved/bookmarked by a client (for self-service users)"""
    __tablename__ = "saved_grants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    grant_id = Column(UUID(as_uuid=True), ForeignKey("grants.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text)  # User's personal notes
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="saved_grants")
    grant = relationship("Grant")
