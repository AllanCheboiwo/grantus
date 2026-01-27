from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.client import Client, ClientUser, SavedGrant
from app.models.application import Application, ApplicationEvent
from app.models.grant import Grant, GrantStatus, DeadlineType
from app.models.lookup import Cause, ApplicantType, Province, EligibilityFlag
from app.schemas.client import ClientResponse, ClientEligibility, SavedGrantCreate, SavedGrantUpdate, SavedGrantResponse
from app.schemas.application import ApplicationResponse, ApplicationEventResponse
from app.schemas.grant import GrantResponse

router = APIRouter()


def get_client_for_user(user: User, db: Session) -> Client:
    """Get the client organization linked to a client user"""
    if user.role != UserRole.client:
        raise HTTPException(status_code=403, detail="Not a client user")
    
    client_user = db.query(ClientUser).filter(ClientUser.user_id == user.id).first()
    if not client_user:
        raise HTTPException(status_code=404, detail="No client organization linked to this user")
    
    client = db.query(Client).filter(Client.id == client_user.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client organization not found")
    
    return client


def require_grant_db_access(client: Client) -> None:
    """Check if client has access to grant database (subscription or manual override)"""
    if not client.grant_db_access:
        raise HTTPException(
            status_code=403, 
            detail="Subscription required to access the grant database. Please upgrade your plan."
        )


@router.get("/my-client", response_model=ClientResponse)
async def get_my_client(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the client organization for the logged-in client user"""
    return get_client_for_user(current_user, db)


@router.get("/applications", response_model=List[ApplicationResponse])
async def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all applications for the client's organization"""
    client = get_client_for_user(current_user, db)
    
    applications = db.query(Application).filter(
        Application.client_id == client.id
    ).order_by(Application.updated_at.desc()).all()
    
    return applications


@router.get("/applications/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific application (must belong to user's client org)"""
    client = get_client_for_user(current_user, db)
    
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.client_id == client.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return application


@router.get("/applications/{application_id}/events", response_model=List[ApplicationEventResponse])
async def get_application_events(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get events for a specific application (must belong to user's client org)"""
    client = get_client_for_user(current_user, db)
    
    # Verify application belongs to client
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.client_id == client.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    events = db.query(ApplicationEvent).filter(
        ApplicationEvent.application_id == application_id
    ).order_by(ApplicationEvent.created_at.desc()).all()
    
    return events


# ==================== GRANT DATABASE (Subscription Required) ====================

@router.get("/grants", response_model=List[GrantResponse])
async def list_grants_for_client(
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
    """
    List grants with optional filters.
    REQUIRES SUBSCRIPTION - client must have grant_db_access.
    """
    client = get_client_for_user(current_user, db)
    require_grant_db_access(client)
    
    query = db.query(Grant)
    
    # Default to only showing open grants for clients
    if status:
        query = query.filter(Grant.status == status)
    else:
        query = query.filter(Grant.status == GrantStatus.open)
    
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


@router.get("/grants/matches", response_model=List[GrantResponse])
async def find_matching_grants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Find grants that match the client's eligibility profile.
    REQUIRES SUBSCRIPTION - client must have grant_db_access.
    """
    client = get_client_for_user(current_user, db)
    require_grant_db_access(client)
    
    # Get client's eligibility criteria
    client_cause_ids = [c.id for c in client.causes]
    client_type_ids = [t.id for t in client.applicant_types]
    client_province_ids = [p.id for p in client.provinces]
    
    # Build query - grants that match at least one criterion in each category
    query = db.query(Grant).filter(Grant.status == GrantStatus.open)
    
    # Match by cause (if client has causes specified)
    if client_cause_ids:
        query = query.filter(
            Grant.causes.any(Cause.id.in_(client_cause_ids))
        )
    
    # Match by applicant type (if client has types specified)
    if client_type_ids:
        query = query.filter(
            Grant.applicant_types.any(ApplicantType.id.in_(client_type_ids))
        )
    
    # Match by province (if client has provinces specified)
    if client_province_ids:
        query = query.filter(
            Grant.provinces.any(Province.id.in_(client_province_ids))
        )
    
    grants = query.order_by(Grant.deadline_at.asc().nullslast(), Grant.name).all()
    return grants


@router.get("/grants/{grant_id}", response_model=GrantResponse)
async def get_grant_for_client(
    grant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get grant details by ID.
    REQUIRES SUBSCRIPTION - client must have grant_db_access.
    """
    client = get_client_for_user(current_user, db)
    require_grant_db_access(client)
    
    grant = db.query(Grant).filter(Grant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    
    return grant


# ==================== SAVED GRANTS (Self-Service Feature) ====================

@router.get("/saved-grants", response_model=List[SavedGrantResponse])
async def get_saved_grants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all saved/bookmarked grants for the client"""
    client = get_client_for_user(current_user, db)
    
    saved = db.query(SavedGrant).filter(
        SavedGrant.client_id == client.id
    ).order_by(SavedGrant.created_at.desc()).all()
    
    return saved


@router.get("/saved-grants/with-details")
async def get_saved_grants_with_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get saved grants with full grant details"""
    client = get_client_for_user(current_user, db)
    
    saved = db.query(SavedGrant).filter(
        SavedGrant.client_id == client.id
    ).order_by(SavedGrant.created_at.desc()).all()
    
    result = []
    for s in saved:
        result.append({
            "id": s.id,
            "client_id": s.client_id,
            "grant_id": s.grant_id,
            "notes": s.notes,
            "created_at": s.created_at,
            "grant": s.grant
        })
    
    return result


@router.post("/saved-grants", response_model=SavedGrantResponse)
async def save_grant(
    data: SavedGrantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save/bookmark a grant"""
    client = get_client_for_user(current_user, db)
    require_grant_db_access(client)
    
    # Check if grant exists
    grant = db.query(Grant).filter(Grant.id == data.grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Grant not found")
    
    # Check if already saved
    existing = db.query(SavedGrant).filter(
        SavedGrant.client_id == client.id,
        SavedGrant.grant_id == data.grant_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Grant already saved")
    
    saved = SavedGrant(
        client_id=client.id,
        grant_id=data.grant_id,
        notes=data.notes
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)
    
    return saved


@router.patch("/saved-grants/{saved_id}", response_model=SavedGrantResponse)
async def update_saved_grant(
    saved_id: UUID,
    data: SavedGrantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update notes on a saved grant"""
    client = get_client_for_user(current_user, db)
    
    saved = db.query(SavedGrant).filter(
        SavedGrant.id == saved_id,
        SavedGrant.client_id == client.id
    ).first()
    
    if not saved:
        raise HTTPException(status_code=404, detail="Saved grant not found")
    
    if data.notes is not None:
        saved.notes = data.notes
    
    db.commit()
    db.refresh(saved)
    
    return saved


@router.delete("/saved-grants/{saved_id}")
async def remove_saved_grant(
    saved_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a saved grant"""
    client = get_client_for_user(current_user, db)
    
    saved = db.query(SavedGrant).filter(
        SavedGrant.id == saved_id,
        SavedGrant.client_id == client.id
    ).first()
    
    if not saved:
        raise HTTPException(status_code=404, detail="Saved grant not found")
    
    db.delete(saved)
    db.commit()
    
    return {"message": "Grant removed from saved"}


@router.delete("/saved-grants/by-grant/{grant_id}")
async def remove_saved_grant_by_grant_id(
    grant_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a saved grant by grant ID"""
    client = get_client_for_user(current_user, db)
    
    saved = db.query(SavedGrant).filter(
        SavedGrant.client_id == client.id,
        SavedGrant.grant_id == grant_id
    ).first()
    
    if not saved:
        raise HTTPException(status_code=404, detail="Saved grant not found")
    
    db.delete(saved)
    db.commit()
    
    return {"message": "Grant removed from saved"}


# ==================== PROFILE (Self-Service Feature) ====================

@router.patch("/profile/eligibility", response_model=ClientResponse)
async def update_my_eligibility(
    eligibility: ClientEligibility,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update my organization's eligibility profile (for self-service users)"""
    client = get_client_for_user(current_user, db)
    
    # Update eligibility criteria
    client.causes = db.query(Cause).filter(Cause.id.in_(eligibility.cause_ids)).all()
    client.applicant_types = db.query(ApplicantType).filter(ApplicantType.id.in_(eligibility.applicant_type_ids)).all()
    client.provinces = db.query(Province).filter(Province.id.in_(eligibility.province_ids)).all()
    client.eligibility_flags = db.query(EligibilityFlag).filter(EligibilityFlag.id.in_(eligibility.eligibility_flag_ids)).all()
    
    db.commit()
    db.refresh(client)
    
    return client


@router.patch("/profile", response_model=ClientResponse)
async def update_my_profile(
    name: Optional[str] = None,
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update my organization's basic info (for self-service users)"""
    client = get_client_for_user(current_user, db)
    
    if name:
        client.name = name
    if entity_type:
        client.entity_type = entity_type
    
    db.commit()
    db.refresh(client)
    
    return client


# ==================== DASHBOARD STATS ====================

@router.get("/stats")
async def get_portal_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard stats based on client type"""
    client = get_client_for_user(current_user, db)
    
    if client.client_type == "self_service":
        # Self-service stats
        saved_count = db.query(SavedGrant).filter(SavedGrant.client_id == client.id).count()
        
        # Matching grants count (if has access)
        matching_count = 0
        if client.grant_db_access:
            client_cause_ids = [c.id for c in client.causes]
            client_type_ids = [t.id for t in client.applicant_types]
            client_province_ids = [p.id for p in client.provinces]
            
            query = db.query(Grant).filter(Grant.status == GrantStatus.open)
            if client_cause_ids:
                query = query.filter(Grant.causes.any(Cause.id.in_(client_cause_ids)))
            if client_type_ids:
                query = query.filter(Grant.applicant_types.any(ApplicantType.id.in_(client_type_ids)))
            if client_province_ids:
                query = query.filter(Grant.provinces.any(Province.id.in_(client_province_ids)))
            matching_count = query.count()
        
        # New grants this week
        from datetime import timedelta
        from datetime import datetime
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_this_week = db.query(Grant).filter(
            Grant.created_at >= week_ago,
            Grant.status == GrantStatus.open
        ).count()
        
        return {
            "client_type": "self_service",
            "saved_grants": saved_count,
            "matching_grants": matching_count,
            "new_this_week": new_this_week,
            "has_access": client.grant_db_access
        }
    else:
        # Managed client stats
        from app.models.application import Application
        
        apps = db.query(Application).filter(Application.client_id == client.id).all()
        
        total = len(apps)
        active = len([a for a in apps if a.stage in ['draft', 'in_progress', 'submitted', 'reporting']])
        pending = len([a for a in apps if a.stage == 'submitted'])
        completed = len([a for a in apps if a.stage in ['awarded', 'declined', 'closed']])
        
        return {
            "client_type": "managed",
            "total_applications": total,
            "active": active,
            "pending_decision": pending,
            "completed": completed
        }
