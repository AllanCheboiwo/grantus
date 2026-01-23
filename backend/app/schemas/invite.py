from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


class InviteCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    client_role: Optional[str] = "viewer"


class InviteResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str]
    client_id: UUID
    client_role: Optional[str]
    token: str
    expires_at: datetime
    created_at: datetime
    is_expired: bool
    
    class Config:
        from_attributes = True


class InviteAccept(BaseModel):
    token: str
    password: str


class InviteInfo(BaseModel):
    """Public info about an invite (shown on accept page)"""
    email: str
    name: Optional[str]
    client_name: str
    is_expired: bool
    is_valid: bool
