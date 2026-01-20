from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from app.models.grant import GrantStatus, DeadlineType
from app.schemas.lookup import CauseResponse, ApplicantTypeResponse, ProvinceResponse, EligibilityFlagResponse


class GrantBase(BaseModel):
    name: str
    funder: Optional[str] = None
    description: Optional[str] = None
    source_url: Optional[str] = None
    notes: Optional[str] = None
    status: GrantStatus = GrantStatus.unknown
    deadline_type: DeadlineType = DeadlineType.rolling
    deadline_at: Optional[date] = None
    next_deadline_at: Optional[date] = None
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    currency: str = "CAD"


class GrantCreate(GrantBase):
    cause_ids: Optional[List[UUID]] = []
    applicant_type_ids: Optional[List[UUID]] = []
    province_ids: Optional[List[UUID]] = []
    eligibility_flag_ids: Optional[List[UUID]] = []


class GrantUpdate(BaseModel):
    name: Optional[str] = None
    funder: Optional[str] = None
    description: Optional[str] = None
    source_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[GrantStatus] = None
    deadline_type: Optional[DeadlineType] = None
    deadline_at: Optional[date] = None
    next_deadline_at: Optional[date] = None
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    currency: Optional[str] = None
    cause_ids: Optional[List[UUID]] = None
    applicant_type_ids: Optional[List[UUID]] = None
    province_ids: Optional[List[UUID]] = None
    eligibility_flag_ids: Optional[List[UUID]] = None


class GrantResponse(GrantBase):
    id: UUID
    last_verified_at: Optional[datetime] = None
    created_by_user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    causes: List[CauseResponse] = []
    applicant_types: List[ApplicantTypeResponse] = []
    provinces: List[ProvinceResponse] = []
    eligibility_flags: List[EligibilityFlagResponse] = []

    class Config:
        from_attributes = True


class GrantFilter(BaseModel):
    status: Optional[GrantStatus] = None
    province_id: Optional[UUID] = None
    applicant_type_id: Optional[UUID] = None
    cause_id: Optional[UUID] = None
    deadline_type: Optional[DeadlineType] = None
    search: Optional[str] = None
