from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, get_current_staff_user
from app.models.user import User
from app.models.grant import Grant, GrantStatus, DeadlineType
from app.models.lookup import Cause, ApplicantType, Province, EligibilityFlag
from app.schemas.grant import GrantCreate, GrantUpdate, GrantResponse

router = APIRouter()


@router.get("/", response_model=List[GrantResponse])
async def list_grants(
    status: Optional[GrantStatus] = None,
    province_id: Optional[UUID] = None,
    applicant_type_id: Optional[UUID] = None,
    cause_id: Optional[UUID] = None,
    deadline_type: Optional[DeadlineType] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List grants with optional filters"""
    query = db.query(Grant)
    
    if status:
        query = query.filter(Grant.status == status)
    
    if deadline_type:
        query = query.filter(Grant.deadline_type == deadline_type)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Grant.name.ilike(search_term)) |
            (Grant.description.ilike(search_term)) |
            (Grant.funder.ilike(search_term))
        )
    
    if province_id:
        query = query.filter(Grant.provinces.any(Province.id == province_id))
    
    if applicant_type_id:
        query = query.filter(Grant.applicant_types.any(ApplicantType.id == applicant_type_id))
    
    if cause_id:
        query = query.filter(Grant.causes.any(Cause.id == cause_id))
    
    grants = query.order_by(Grant.deadline_at.asc().nullslast(), Grant.name).offset(skip).limit(limit).all()
    return grants


@router.get("/{grant_id}", response_model=GrantResponse)
async def get_grant(
    grant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get grant by ID"""
    grant = db.query(Grant).filter(Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    return grant


@router.post("/", response_model=GrantResponse)
async def create_grant(
    grant_data: GrantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Create a new grant"""
    grant = Grant(
        name=grant_data.name,
        funder=grant_data.funder,
        description=grant_data.description,
        source_url=grant_data.source_url,
        notes=grant_data.notes,
        status=grant_data.status,
        deadline_type=grant_data.deadline_type,
        deadline_at=grant_data.deadline_at,
        next_deadline_at=grant_data.next_deadline_at,
        amount_min=grant_data.amount_min,
        amount_max=grant_data.amount_max,
        currency=grant_data.currency,
        created_by_user_id=current_user.id
    )
    
    # Add relationships
    if grant_data.cause_ids:
        causes = db.query(Cause).filter(Cause.id.in_(grant_data.cause_ids)).all()
        grant.causes = causes
    
    if grant_data.applicant_type_ids:
        types = db.query(ApplicantType).filter(ApplicantType.id.in_(grant_data.applicant_type_ids)).all()
        grant.applicant_types = types
    
    if grant_data.province_ids:
        provinces = db.query(Province).filter(Province.id.in_(grant_data.province_ids)).all()
        grant.provinces = provinces
    
    if grant_data.eligibility_flag_ids:
        flags = db.query(EligibilityFlag).filter(EligibilityFlag.id.in_(grant_data.eligibility_flag_ids)).all()
        grant.eligibility_flags = flags
    
    db.add(grant)
    db.commit()
    db.refresh(grant)
    
    return grant


@router.patch("/{grant_id}", response_model=GrantResponse)
async def update_grant(
    grant_id: UUID,
    grant_data: GrantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update a grant"""
    grant = db.query(Grant).filter(Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    
    update_data = grant_data.model_dump(exclude_unset=True)
    
    # Handle relationships separately
    if "cause_ids" in update_data:
        cause_ids = update_data.pop("cause_ids")
        grant.causes = db.query(Cause).filter(Cause.id.in_(cause_ids)).all()
    
    if "applicant_type_ids" in update_data:
        type_ids = update_data.pop("applicant_type_ids")
        grant.applicant_types = db.query(ApplicantType).filter(ApplicantType.id.in_(type_ids)).all()
    
    if "province_ids" in update_data:
        province_ids = update_data.pop("province_ids")
        grant.provinces = db.query(Province).filter(Province.id.in_(province_ids)).all()
    
    if "eligibility_flag_ids" in update_data:
        flag_ids = update_data.pop("eligibility_flag_ids")
        grant.eligibility_flags = db.query(EligibilityFlag).filter(EligibilityFlag.id.in_(flag_ids)).all()
    
    # Update other fields
    for field, value in update_data.items():
        setattr(grant, field, value)
    
    db.commit()
    db.refresh(grant)
    
    return grant


@router.post("/{grant_id}/verify", response_model=GrantResponse)
async def verify_grant(
    grant_id: UUID,
    status: GrantStatus = GrantStatus.open,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Verify a grant and update its status"""
    grant = db.query(Grant).filter(Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    
    grant.last_verified_at = datetime.utcnow()
    grant.status = status
    
    db.commit()
    db.refresh(grant)
    
    return grant


@router.delete("/{grant_id}")
async def delete_grant(
    grant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete a grant"""
    grant = db.query(Grant).filter(Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    
    db.delete(grant)
    db.commit()
    
    return {"message": "Grant deleted"}
