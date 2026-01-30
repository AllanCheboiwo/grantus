"""Request from self-service user to get expert/managed service."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ManagedServiceRequest(Base):
    """Self-service user expressed interest in managed/expert help."""
    __tablename__ = "managed_service_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    contact_phone = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, contacted, converted, closed
    notes = Column(Text)  # Staff notes
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="managed_service_requests")

    def __repr__(self):
        return f"<ManagedServiceRequest {self.id} client={self.client_id}>"
