from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from app.models.match import MatchStatus
from app.schemas.grant import GrantResponse


class MatchBase(BaseModel):
    fit_score: int = 0
    fit_level: Optional[str] = None
    reasons: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    status: MatchStatus = MatchStatus.new


class MatchCreate(MatchBase):
    client_id: UUID
    grant_id: UUID
    owner_user_id: Optional[UUID] = None


class MatchUpdate(BaseModel):
    status: Optional[MatchStatus] = None
    notes: Optional[str] = None
    owner_user_id: Optional[UUID] = None


class MatchResponse(MatchBase):
    id: UUID
    client_id: UUID
    grant_id: UUID
    owner_user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    grant: Optional[GrantResponse] = None

    class Config:
        from_attributes = True


class MatchGenerate(BaseModel):
    """Result of match generation for a client"""
    grant: GrantResponse
    fit_score: int
    fit_level: str
    reasons: Dict[str, Any]
