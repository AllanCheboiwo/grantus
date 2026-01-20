import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Date, Numeric, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class ApplicationStage(str, enum.Enum):
    draft = "draft"
    in_progress = "in_progress"
    submitted = "submitted"
    awarded = "awarded"
    declined = "declined"
    reporting = "reporting"
    closed = "closed"


class EventType(str, enum.Enum):
    status_change = "status_change"
    note = "note"
    doc_request = "doc_request"
    submission = "submission"
    decision = "decision"


class Application(Base):
    """Client application to a specific grant"""
    __tablename__ = "applications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    grant_id = Column(UUID(as_uuid=True), ForeignKey("grants.id", ondelete="CASCADE"), nullable=False)
    match_id = Column(UUID(as_uuid=True), ForeignKey("matches.id"))
    
    # Workflow
    stage = Column(SQLEnum(ApplicationStage), nullable=False, default=ApplicationStage.draft)
    internal_deadline_at = Column(Date)
    submitted_at = Column(DateTime)
    decision_at = Column(DateTime)
    
    # Funding
    amount_requested = Column(Numeric(12, 2))
    amount_awarded = Column(Numeric(12, 2))
    
    # Assignment
    assigned_to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Optional cycle tracking
    cycle_year = Column(Integer)
    round_label = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="applications")
    grant = relationship("Grant", back_populates="applications")
    match = relationship("Match", back_populates="application")
    assigned_to = relationship("User", back_populates="assigned_applications", foreign_keys=[assigned_to_user_id])
    events = relationship("ApplicationEvent", back_populates="application", order_by="desc(ApplicationEvent.created_at)")
    messages = relationship("Message", back_populates="application")
    
    def __repr__(self):
        return f"<Application {self.id} stage={self.stage}>"


class ApplicationEvent(Base):
    """Timeline event for application (status changes, notes, etc.)"""
    __tablename__ = "application_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(SQLEnum(EventType), nullable=False)
    
    from_stage = Column(String)
    to_stage = Column(String)
    
    note = Column(Text)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    application = relationship("Application", back_populates="events")
    created_by = relationship("User")
    
    def __repr__(self):
        return f"<ApplicationEvent {self.event_type} on {self.application_id}>"
