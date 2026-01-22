import uuid
import secrets
from datetime import datetime, timedelta
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_invite_token():
    """Generate a secure random token for invites"""
    return secrets.token_urlsafe(32)


def get_expiry_date(days=7):
    """Get expiry date (default 7 days from now)"""
    return datetime.utcnow() + timedelta(days=days)


class ClientInvite(Base):
    """Pending invites for client portal users"""
    __tablename__ = "client_invites"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False)
    name = Column(String)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    client_role = Column(String, default="viewer")  # viewer, owner
    token = Column(String, unique=True, nullable=False, default=generate_invite_token)
    expires_at = Column(DateTime, nullable=False, default=get_expiry_date)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    client = relationship("Client")
    created_by = relationship("User")
    
    @property
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def __repr__(self):
        return f"<ClientInvite {self.email} -> {self.client_id}>"
