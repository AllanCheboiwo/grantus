import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class MatchStatus(str, enum.Enum):
    new = "new"
    qualified = "qualified"
    rejected = "rejected"
    converted = "converted"


class Match(Base):
    """Stored recommendation linking a client to a grant"""
    __tablename__ = "matches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    grant_id = Column(UUID(as_uuid=True), ForeignKey("grants.id", ondelete="CASCADE"), nullable=False)
    
    # Matching metrics
    fit_score = Column(Integer, nullable=False, default=0)  # 0-100
    fit_level = Column(String)  # high, medium, low
    reasons = Column(JSONB)  # Explainable matching output
    notes = Column(Text)
    
    # Status and ownership
    status = Column(SQLEnum(MatchStatus), nullable=False, default=MatchStatus.new)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="matches")
    grant = relationship("Grant", back_populates="matches")
    owner = relationship("User", back_populates="owned_matches", foreign_keys=[owner_user_id])
    application = relationship("Application", back_populates="match", uselist=False)
    
    __table_args__ = (
        UniqueConstraint("client_id", "grant_id", name="unique_match_per_client_grant"),
    )
    
    def __repr__(self):
        return f"<Match client={self.client_id} grant={self.grant_id}>"
