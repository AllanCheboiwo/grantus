from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.lookup import Cause, ApplicantType, Province, EligibilityFlag
from app.schemas.lookup import CauseResponse, ApplicantTypeResponse, ProvinceResponse, EligibilityFlagResponse

router = APIRouter()


@router.get("/causes", response_model=List[CauseResponse])
async def list_causes(
    db: Session = Depends(get_db)
):
    """Get all active causes"""
    return db.query(Cause).filter(Cause.is_active == True).order_by(Cause.name).all()


@router.get("/applicant-types", response_model=List[ApplicantTypeResponse])
async def list_applicant_types(
    db: Session = Depends(get_db)
):
    """Get all active applicant types"""
    return db.query(ApplicantType).filter(ApplicantType.is_active == True).order_by(ApplicantType.name).all()


@router.get("/provinces", response_model=List[ProvinceResponse])
async def list_provinces(
    db: Session = Depends(get_db)
):
    """Get all active provinces"""
    return db.query(Province).filter(Province.is_active == True).order_by(Province.name).all()


@router.get("/eligibility-flags", response_model=List[EligibilityFlagResponse])
async def list_eligibility_flags(
    db: Session = Depends(get_db)
):
    """Get all active eligibility flags"""
    return db.query(EligibilityFlag).filter(EligibilityFlag.is_active == True).order_by(EligibilityFlag.name).all()
