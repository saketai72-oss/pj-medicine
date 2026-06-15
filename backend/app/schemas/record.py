from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime
from uuid import UUID

class MedicalRecordBase(BaseModel):
    patient_id: UUID
    chief_complaint: str
    description: Optional[str] = None
    symptoms_duration: Optional[str] = None
    vital_signs: Optional[dict[str, Any]] = None
    diagnosis: Optional[str] = None
    diagnosis_icd: Optional[str] = None
    severity: str = 'mild'

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecordResponse(MedicalRecordBase):
    id: UUID
    record_code: str
    created_by: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
