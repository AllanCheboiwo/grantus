from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from app.models.application import ApplicationStage, EventType
from app.schemas.grant import GrantResponse
from app.schemas.client import ClientResponse


class ApplicationBase(BaseModel):
    stage: ApplicationStage = ApplicationStage.draft
    internal_deadline_at: Optional[date] = None
    amount_requested: Optional[Decimal] = None
    cycle_year: Optional[int] = None
    round_label: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    client_id: UUID
    grant_id: UUID
    match_id: Optional[UUID] = None
    assigned_to_user_id: Optional[UUID] = None


class ApplicationUpdate(BaseModel):
    stage: Optional[ApplicationStage] = None
    internal_deadline_at: Optional[date] = None
    submitted_at: Optional[datetime] = None
    decision_at: Optional[datetime] = None
    amount_requested: Optional[Decimal] = None
    amount_awarded: Optional[Decimal] = None
    assigned_to_user_id: Optional[UUID] = None
    cycle_year: Optional[int] = None
    round_label: Optional[str] = None


class ApplicationEventCreate(BaseModel):
    event_type: EventType
    note: Optional[str] = None


class ApplicationEventResponse(BaseModel):
    id: UUID
    application_id: UUID
    event_type: EventType
    from_stage: Optional[str] = None
    to_stage: Optional[str] = None
    note: Optional[str] = None
    created_by_user_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationResponse(ApplicationBase):
    id: UUID
    client_id: UUID
    grant_id: UUID
    match_id: Optional[UUID] = None
    submitted_at: Optional[datetime] = None
    decision_at: Optional[datetime] = None
    amount_awarded: Optional[Decimal] = None
    assigned_to_user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    grant: Optional[GrantResponse] = None
    client: Optional[ClientResponse] = None
    events: List[ApplicationEventResponse] = []

    class Config:
        from_attributes = True
