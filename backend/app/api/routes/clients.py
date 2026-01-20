from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user, get_current_staff_user
from app.models.user import User
from app.models.client import Client
from app.models.lookup import Cause, ApplicantType, Province, EligibilityFlag
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse, ClientEligibility
from app.schemas.message import MessageResponse
from app.models.message import Message

router = APIRouter()


@router.get("/", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """List all clients"""
    query = db.query(Client)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(Client.name.ilike(search_term))
    
    clients = query.order_by(Client.name).offset(skip).limit(limit).all()
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get client by ID"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("/", response_model=ClientResponse)
async def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Create a new client"""
    client = Client(
        name=client_data.name,
        entity_type=client_data.entity_type,
        notes=client_data.notes
    )
    
    # Add eligibility profile
    if client_data.cause_ids:
        client.causes = db.query(Cause).filter(Cause.id.in_(client_data.cause_ids)).all()
    
    if client_data.applicant_type_ids:
        client.applicant_types = db.query(ApplicantType).filter(ApplicantType.id.in_(client_data.applicant_type_ids)).all()
    
    if client_data.province_ids:
        client.provinces = db.query(Province).filter(Province.id.in_(client_data.province_ids)).all()
    
    if client_data.eligibility_flag_ids:
        client.eligibility_flags = db.query(EligibilityFlag).filter(EligibilityFlag.id.in_(client_data.eligibility_flag_ids)).all()
    
    db.add(client)
    db.commit()
    db.refresh(client)
    
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update client info"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    return client


@router.patch("/{client_id}/eligibility", response_model=ClientResponse)
async def update_client_eligibility(
    client_id: UUID,
    eligibility: ClientEligibility,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update client eligibility profile"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client.causes = db.query(Cause).filter(Cause.id.in_(eligibility.cause_ids)).all()
    client.applicant_types = db.query(ApplicantType).filter(ApplicantType.id.in_(eligibility.applicant_type_ids)).all()
    client.provinces = db.query(Province).filter(Province.id.in_(eligibility.province_ids)).all()
    client.eligibility_flags = db.query(EligibilityFlag).filter(EligibilityFlag.id.in_(eligibility.eligibility_flag_ids)).all()
    
    db.commit()
    db.refresh(client)
    
    return client


@router.delete("/{client_id}")
async def delete_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    
    return {"message": "Client deleted"}


@router.get("/{client_id}/messages", response_model=List[MessageResponse])
async def get_client_messages(
    client_id: UUID,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all messages for a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    messages = db.query(Message).filter(
        Message.client_id == client_id
    ).order_by(Message.sent_at.desc()).offset(skip).limit(limit).all()
    
    return messages
