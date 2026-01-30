"""Staff routes for managed service / expert help requests from self-service users."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_staff_user
from app.models.user import User
from app.models.client import Client
from app.models.managed_service_request import ManagedServiceRequest
from app.schemas.client import ManagedServiceRequestResponse
from pydantic import BaseModel

router = APIRouter()


class ManagedServiceRequestUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


@router.get("/", response_model=List[ManagedServiceRequestResponse])
async def list_managed_service_requests(
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user),
):
    """List all managed service / expert help requests (staff only)."""
    query = db.query(ManagedServiceRequest).order_by(ManagedServiceRequest.created_at.desc())
    if status:
        query = query.filter(ManagedServiceRequest.status == status)
    requests = query.all()
    return [ManagedServiceRequestResponse.model_validate(r) for r in requests]


@router.get("/{request_id}", response_model=ManagedServiceRequestResponse)
async def get_managed_service_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user),
):
    """Get a single request (staff only)."""
    req = db.query(ManagedServiceRequest).filter(ManagedServiceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return ManagedServiceRequestResponse.model_validate(req)


@router.patch("/{request_id}", response_model=ManagedServiceRequestResponse)
async def update_managed_service_request(
    request_id: UUID,
    data: ManagedServiceRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user),
):
    """Update status or notes (staff only)."""
    req = db.query(ManagedServiceRequest).filter(ManagedServiceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if data.status is not None:
        req.status = data.status
    if data.notes is not None:
        req.notes = data.notes
    db.commit()
    db.refresh(req)
    return ManagedServiceRequestResponse.model_validate(req)
