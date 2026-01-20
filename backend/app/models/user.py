import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    staff = "staff"
    client = "client"


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.staff)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client_memberships = relationship("ClientUser", back_populates="user")
    owned_matches = relationship("Match", back_populates="owner", foreign_keys="Match.owner_user_id")
    assigned_applications = relationship("Application", back_populates="assigned_to", foreign_keys="Application.assigned_to_user_id")
    created_grants = relationship("Grant", back_populates="created_by", foreign_keys="Grant.created_by_user_id")
    
    def __repr__(self):
        return f"<User {self.email}>"
