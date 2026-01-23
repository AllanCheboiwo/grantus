from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_staff_user, get_password_hash
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.client import Client, ClientUser
from app.models.invite import ClientInvite, generate_invite_token, get_expiry_date
from app.schemas.invite import InviteCreate, InviteResponse, InviteAccept, InviteInfo
from app.services.email import send_invite_email

router = APIRouter()


@router.get("/client/{client_id}", response_model=List[InviteResponse])
async def get_client_invites(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Get all pending invites for a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    invites = db.query(ClientInvite).filter(
        ClientInvite.client_id == client_id
    ).order_by(ClientInvite.created_at.desc()).all()
    
    return invites


@router.post("/client/{client_id}", response_model=InviteResponse)
async def create_invite(
    client_id: UUID,
    invite_data: InviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Create and send an invite to a client user"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if email already exists as a user
    existing_user = db.query(User).filter(User.email == invite_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    # Check for existing pending invite
    existing_invite = db.query(ClientInvite).filter(
        ClientInvite.email == invite_data.email,
        ClientInvite.client_id == client_id
    ).first()
    
    if existing_invite:
        # Update existing invite with new token
        existing_invite.token = generate_invite_token()
        existing_invite.expires_at = get_expiry_date()
        existing_invite.name = invite_data.name
        existing_invite.client_role = invite_data.client_role
        invite = existing_invite
    else:
        # Create new invite
        invite = ClientInvite(
            email=invite_data.email,
            name=invite_data.name,
            client_id=client_id,
            client_role=invite_data.client_role,
            created_by_user_id=current_user.id
        )
        db.add(invite)
    
    db.commit()
    db.refresh(invite)
    
    # Send invite email
    send_invite_email(
        email=invite.email,
        name=invite.name,
        client_name=client.name,
        invite_token=invite.token
    )
    
    return invite


@router.post("/{invite_id}/resend", response_model=InviteResponse)
async def resend_invite(
    invite_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Resend an invite with a new token"""
    invite = db.query(ClientInvite).filter(ClientInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    client = db.query(Client).filter(Client.id == invite.client_id).first()
    
    # Generate new token and reset expiry
    invite.token = generate_invite_token()
    invite.expires_at = get_expiry_date()
    
    db.commit()
    db.refresh(invite)
    
    # Resend email
    send_invite_email(
        email=invite.email,
        name=invite.name,
        client_name=client.name,
        invite_token=invite.token
    )
    
    return invite


@router.delete("/{invite_id}")
async def delete_invite(
    invite_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete/cancel an invite"""
    invite = db.query(ClientInvite).filter(ClientInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    db.delete(invite)
    db.commit()
    
    return {"message": "Invite cancelled"}


# Public endpoints (no auth required)
@router.get("/verify/{token}", response_model=InviteInfo)
async def verify_invite(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify an invite token and return info (public endpoint)"""
    invite = db.query(ClientInvite).filter(ClientInvite.token == token).first()
    
    if not invite:
        return InviteInfo(
            email="",
            name=None,
            client_name="",
            is_expired=False,
            is_valid=False
        )
    
    client = db.query(Client).filter(Client.id == invite.client_id).first()
    
    return InviteInfo(
        email=invite.email,
        name=invite.name,
        client_name=client.name if client else "Unknown",
        is_expired=invite.is_expired,
        is_valid=not invite.is_expired
    )


@router.post("/accept")
async def accept_invite(
    accept_data: InviteAccept,
    db: Session = Depends(get_db)
):
    """Accept an invite and create the user account (public endpoint)"""
    invite = db.query(ClientInvite).filter(
        ClientInvite.token == accept_data.token
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite token"
        )
    
    if invite.is_expired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite has expired. Please request a new one."
        )
    
    # Check if email already registered (shouldn't happen, but just in case)
    existing_user = db.query(User).filter(User.email == invite.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    
    # Create the user
    user = User(
        email=invite.email,
        name=invite.name,
        role=UserRole.client,
        password_hash=get_password_hash(accept_data.password),
        is_active=True
    )
    db.add(user)
    db.flush()  # Get user ID
    
    # Link user to client
    client_user = ClientUser(
        client_id=invite.client_id,
        user_id=user.id,
        client_role=invite.client_role
    )
    db.add(client_user)
    
    # Delete the invite
    db.delete(invite)
    
    db.commit()
    
    return {
        "message": "Account created successfully",
        "email": user.email
    }
