from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.client import Client, ClientUser
from app.models.application import Application, ApplicationEvent
from app.schemas.client import ClientResponse
from app.schemas.application import ApplicationResponse, ApplicationEventResponse

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
