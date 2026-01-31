from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.schemas.lookup import CauseResponse, ApplicantTypeResponse, ProvinceResponse, EligibilityFlagResponse


class ClientBase(BaseModel):
    name: str
    entity_type: Optional[str] = None
    client_type: Optional[str] = "managed"  # managed, self_service
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    cause_ids: Optional[List[UUID]] = []
    applicant_type_ids: Optional[List[UUID]] = []
    province_ids: Optional[List[UUID]] = []
    eligibility_flag_ids: Optional[List[UUID]] = []


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    entity_type: Optional[str] = None
    notes: Optional[str] = None


class ClientEligibility(BaseModel):
    cause_ids: List[UUID] = []
    applicant_type_ids: List[UUID] = []
    province_ids: List[UUID] = []
    eligibility_flag_ids: List[UUID] = []


class ClientResponse(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    causes: List[CauseResponse] = []
    applicant_types: List[ApplicantTypeResponse] = []
    provinces: List[ProvinceResponse] = []
    eligibility_flags: List[EligibilityFlagResponse] = []
    # Subscription fields
    stripe_customer_id: Optional[str] = None
    subscription_id: Optional[str] = None
    subscription_status: Optional[str] = None
    subscription_price_id: Optional[str] = None
    current_period_end: Optional[datetime] = None
    grant_db_access: bool = False

    class Config:
        from_attributes = True


class SubscriptionStatusResponse(BaseModel):
    """Response for subscription status check"""
    has_access: bool
    status: Optional[str] = None
    current_period_end: Optional[datetime] = None
    is_manual_override: bool = False

    class Config:
        from_attributes = True


class GrantAccessUpdate(BaseModel):
    """Request to manually grant/revoke access"""
    grant_db_access: bool


# Client User schemas
class ClientUserCreate(BaseModel):
    email: str
    name: Optional[str] = None
    password: str
    client_role: Optional[str] = "viewer"  # owner, viewer


class ClientUserResponse(BaseModel):
    user_id: UUID
    client_id: UUID
    client_role: Optional[str]
    email: str
    name: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


# Saved Grant schemas (for self-service users)
class SavedGrantCreate(BaseModel):
    grant_id: UUID
    notes: Optional[str] = None


class SavedGrantUpdate(BaseModel):
    notes: Optional[str] = None


class SavedGrantResponse(BaseModel):
    id: UUID
    client_id: UUID
    grant_id: UUID
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Public signup schema
class PublicSignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    organization_name: str
    entity_type: Optional[str] = None


class PublicSignupResponse(BaseModel):
    message: str
    user_id: UUID
    client_id: UUID


# Managed service request (self-service → expert help)
class ManagedServiceRequestCreate(BaseModel):
    message: str
    contact_phone: Optional[str] = None


class ManagedServiceRequestResponse(BaseModel):
    id: UUID
    client_id: UUID
    message: str
    contact_phone: Optional[str]
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
