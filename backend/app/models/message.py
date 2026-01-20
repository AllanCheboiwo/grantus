import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class MessageChannel(str, enum.Enum):
    email = "email"
    portal = "portal"


class Message(Base):
    """Communication log (emails sent to clients)"""
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id"))
    
    channel = Column(SQLEnum(MessageChannel), nullable=False, default=MessageChannel.email)
    subject = Column(String)
    body = Column(Text)
    sent_to = Column(String)  # Email address
    sent_at = Column(DateTime)
    
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="messages")
    application = relationship("Application", back_populates="messages")
    created_by = relationship("User")
    
    def __repr__(self):
        return f"<Message {self.id} to {self.sent_to}>"
