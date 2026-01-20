from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.message import MessageChannel


class MessageBase(BaseModel):
    channel: MessageChannel = MessageChannel.email
    subject: Optional[str] = None
    body: Optional[str] = None
    sent_to: Optional[str] = None


class MessageCreate(MessageBase):
    client_id: UUID
    application_id: Optional[UUID] = None


class MessageResponse(MessageBase):
    id: UUID
    client_id: UUID
    application_id: Optional[UUID] = None
    sent_at: Optional[datetime] = None
    created_by_user_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True
