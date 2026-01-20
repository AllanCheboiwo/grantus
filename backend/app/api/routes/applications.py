from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, get_current_staff_user
from app.models.user import User
from app.models.application import Application, ApplicationEvent, ApplicationStage, EventType
from app.models.match import Match, MatchStatus
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    ApplicationEventCreate, ApplicationEventResponse
)

router = APIRouter()


# Stages that trigger client email notifications
NOTIFY_STAGES = [ApplicationStage.submitted, ApplicationStage.awarded, ApplicationStage.declined]


@router.get("/", response_model=List[ApplicationResponse])
async def list_applications(
    client_id: Optional[UUID] = None,
    stage: Optional[ApplicationStage] = None,
    assigned_to_user_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List applications with optional filters"""
    query = db.query(Application)
    
    # If client user, only show their applications
    if current_user.role == "client":
        # Get client IDs this user belongs to
        from app.models.client import ClientUser
        client_ids = [
            cu.client_id for cu in 
            db.query(ClientUser).filter(ClientUser.user_id == current_user.id).all()
        ]
        query = query.filter(Application.client_id.in_(client_ids))
    
    if client_id:
        query = query.filter(Application.client_id == client_id)
    
    if stage:
        query = query.filter(Application.stage == stage)
    
    if assigned_to_user_id:
        query = query.filter(Application.assigned_to_user_id == assigned_to_user_id)
    
    applications = query.order_by(
        Application.internal_deadline_at.asc().nullslast(),
        Application.updated_at.desc()
    ).offset(skip).limit(limit).all()
    
    return applications


@router.get("/pipeline")
async def get_pipeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Get application counts by stage for pipeline view"""
    from sqlalchemy import func
    
    counts = db.query(
        Application.stage,
        func.count(Application.id)
    ).group_by(Application.stage).all()
    
    pipeline = {stage.value: 0 for stage in ApplicationStage}
    for stage, count in counts:
        pipeline[stage.value] = count
    
    return pipeline


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get application by ID"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Check access for client users
    if current_user.role == "client":
        from app.models.client import ClientUser
        membership = db.query(ClientUser).filter(
            ClientUser.user_id == current_user.id,
            ClientUser.client_id == application.client_id
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return application


@router.post("/", response_model=ApplicationResponse)
async def create_application(
    app_data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Create a new application"""
    application = Application(
        client_id=app_data.client_id,
        grant_id=app_data.grant_id,
        match_id=app_data.match_id,
        stage=app_data.stage,
        internal_deadline_at=app_data.internal_deadline_at,
        amount_requested=app_data.amount_requested,
        cycle_year=app_data.cycle_year,
        round_label=app_data.round_label,
        assigned_to_user_id=app_data.assigned_to_user_id or current_user.id
    )
    
    db.add(application)
    db.flush()  # Get the ID
    
    # Create initial event
    event = ApplicationEvent(
        application_id=application.id,
        event_type=EventType.status_change,
        from_stage=None,
        to_stage=app_data.stage.value,
        created_by_user_id=current_user.id
    )
    db.add(event)
    
    # Update match status if linked
    if app_data.match_id:
        match = db.query(Match).filter(Match.id == app_data.match_id).first()
        if match:
            match.status = MatchStatus.converted
    
    db.commit()
    db.refresh(application)
    
    return application


@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: UUID,
    app_data: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update an application"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    old_stage = application.stage
    update_data = app_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(application, field, value)
    
    # If stage changed, create event
    if "stage" in update_data and update_data["stage"] != old_stage:
        new_stage = update_data["stage"]
        
        # Update timestamps based on stage
        if new_stage == ApplicationStage.submitted and not application.submitted_at:
            application.submitted_at = datetime.utcnow()
        elif new_stage in [ApplicationStage.awarded, ApplicationStage.declined]:
            application.decision_at = datetime.utcnow()
        
        event = ApplicationEvent(
            application_id=application.id,
            event_type=EventType.status_change,
            from_stage=old_stage.value,
            to_stage=new_stage.value,
            created_by_user_id=current_user.id
        )
        db.add(event)
        
        # TODO: Trigger email notification if stage in NOTIFY_STAGES
        if new_stage in NOTIFY_STAGES:
            # Email notification would be triggered here
            pass
    
    db.commit()
    db.refresh(application)
    
    return application


@router.post("/{application_id}/events", response_model=ApplicationEventResponse)
async def add_application_event(
    application_id: UUID,
    event_data: ApplicationEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Add note or document request to application"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    event = ApplicationEvent(
        application_id=application_id,
        event_type=event_data.event_type,
        note=event_data.note,
        created_by_user_id=current_user.id
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    return event


@router.get("/{application_id}/events", response_model=List[ApplicationEventResponse])
async def get_application_events(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all events for an application"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    events = db.query(ApplicationEvent).filter(
        ApplicationEvent.application_id == application_id
    ).order_by(ApplicationEvent.created_at.desc()).all()
    
    return events


@router.delete("/{application_id}")
async def delete_application(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete an application"""
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(application)
    db.commit()
    
    return {"message": "Application deleted"}
