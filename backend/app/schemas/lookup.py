from pydantic import BaseModel
from uuid import UUID


class CauseResponse(BaseModel):
    id: UUID
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class ApplicantTypeResponse(BaseModel):
    id: UUID
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class ProvinceResponse(BaseModel):
    id: UUID
    code: str
    name: str
    country_code: str
    is_active: bool

    class Config:
        from_attributes = True


class EligibilityFlagResponse(BaseModel):
    id: UUID
    name: str
    is_active: bool

    class Config:
        from_attributes = True
