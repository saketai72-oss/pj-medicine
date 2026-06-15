from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

class PatientBase(BaseModel):
    full_name: str
    date_of_birth: date
    gender: str
    phone: Optional[str] = None
    address: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[List[str]] = []
    chronic_diseases: Optional[List[str]] = []

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: UUID
    patient_code: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
