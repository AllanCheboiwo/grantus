from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from uuid import UUID
from app.core.database import get_db
from app.core.security import get_current_user, get_current_staff_user
from app.models.user import User
from app.models.client import Client
from app.models.grant import Grant, GrantStatus
from app.models.match import Match, MatchStatus
from app.schemas.match import MatchCreate, MatchUpdate, MatchResponse, MatchGenerate

router = APIRouter()


def calculate_fit_score(client: Client, grant: Grant) -> tuple[int, str, dict]:
    """Calculate fit score between a client and a grant"""
    score = 0
    reasons = {
        "matching_causes": [],
        "matching_applicant_types": [],
        "matching_provinces": [],
        "matching_flags": [],
        "issues": []
    }
    
    # Check causes (30 points max)
    client_cause_ids = {c.id for c in client.causes}
    grant_cause_ids = {c.id for c in grant.causes}
    matching_causes = client_cause_ids & grant_cause_ids
    
    if grant_cause_ids:
        cause_score = int((len(matching_causes) / len(grant_cause_ids)) * 30)
        score += cause_score
        reasons["matching_causes"] = [c.name for c in client.causes if c.id in matching_causes]
        if not matching_causes:
            reasons["issues"].append("No matching causes")
    else:
        score += 30  # No cause requirement = full points
    
    # Check applicant types (30 points max)
    client_type_ids = {t.id for t in client.applicant_types}
    grant_type_ids = {t.id for t in grant.applicant_types}
    matching_types = client_type_ids & grant_type_ids
    
    if grant_type_ids:
        type_score = int((len(matching_types) / len(grant_type_ids)) * 30)
        score += type_score
        reasons["matching_applicant_types"] = [t.name for t in client.applicant_types if t.id in matching_types]
        if not matching_types:
            reasons["issues"].append("No matching applicant types")
    else:
        score += 30
    
    # Check provinces (30 points max)
    client_province_ids = {p.id for p in client.provinces}
    grant_province_ids = {p.id for p in grant.provinces}
    matching_provinces = client_province_ids & grant_province_ids
    
    if grant_province_ids:
        province_score = int((len(matching_provinces) / len(grant_province_ids)) * 30)
        score += province_score
        reasons["matching_provinces"] = [p.name for p in client.provinces if p.id in matching_provinces]
        if not matching_provinces:
            reasons["issues"].append("No matching provinces")
    else:
        score += 30  # No province requirement = full points (national grant)
    
    # Check eligibility flags (10 points max)
    client_flag_ids = {f.id for f in client.eligibility_flags}
    grant_flag_ids = {f.id for f in grant.eligibility_flags}
    matching_flags = client_flag_ids & grant_flag_ids
    
    if grant_flag_ids:
        flag_score = int((len(matching_flags) / len(grant_flag_ids)) * 10)
        score += flag_score
        reasons["matching_flags"] = [f.name for f in client.eligibility_flags if f.id in matching_flags]
    else:
        score += 10
    
    # Determine fit level
    if score >= 80:
        fit_level = "high"
    elif score >= 50:
        fit_level = "medium"
    else:
        fit_level = "low"
    
    return score, fit_level, reasons


@router.get("/", response_model=List[MatchResponse])
async def list_matches(
    client_id: Optional[UUID] = None,
    status: Optional[MatchStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """List all matches with optional filters"""
    query = db.query(Match)
    
    if client_id:
        query = query.filter(Match.client_id == client_id)
    
    if status:
        query = query.filter(Match.status == status)
    
    matches = query.order_by(Match.fit_score.desc()).offset(skip).limit(limit).all()
    return matches


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Get match by ID"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/generate/{client_id}", response_model=List[MatchGenerate])
async def generate_matches(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Generate match recommendations for a client (does not save)"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get all open grants
    grants = db.query(Grant).filter(Grant.status == GrantStatus.open).all()
    
    # Calculate fit scores
    results = []
    for grant in grants:
        score, fit_level, reasons = calculate_fit_score(client, grant)
        if score > 0:  # Only include grants with some match
            results.append(MatchGenerate(
                grant=grant,
                fit_score=score,
                fit_level=fit_level,
                reasons=reasons
            ))
    
    # Sort by score descending
    results.sort(key=lambda x: x.fit_score, reverse=True)
    
    return results


@router.post("/", response_model=MatchResponse)
async def create_match(
    match_data: MatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Save a match decision"""
    # Check for existing match
    existing = db.query(Match).filter(
        and_(Match.client_id == match_data.client_id, Match.grant_id == match_data.grant_id)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Match already exists for this client and grant"
        )
    
    match = Match(
        client_id=match_data.client_id,
        grant_id=match_data.grant_id,
        fit_score=match_data.fit_score,
        fit_level=match_data.fit_level,
        reasons=match_data.reasons,
        notes=match_data.notes,
        status=match_data.status,
        owner_user_id=match_data.owner_user_id or current_user.id
    )
    
    db.add(match)
    db.commit()
    db.refresh(match)
    
    return match


@router.patch("/{match_id}", response_model=MatchResponse)
async def update_match(
    match_id: UUID,
    match_data: MatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Update match status/notes"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    update_data = match_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(match, field, value)
    
    db.commit()
    db.refresh(match)
    
    return match


@router.delete("/{match_id}")
async def delete_match(
    match_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_staff_user)
):
    """Delete a match"""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    db.delete(match)
    db.commit()
    
    return {"message": "Match deleted"}
