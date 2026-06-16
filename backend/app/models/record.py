import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Uuid, JSON

from app.models.base import Base

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_code = Column(String(30), unique=True, nullable=False)
    patient_id = Column(Uuid(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)

    chief_complaint = Column(Text, nullable=False)
    description = Column(Text)
    symptoms_duration = Column(String(50))
    
    vital_signs = Column(JSON)
    diagnosis = Column(String(200))
    diagnosis_icd = Column(String(10))
    severity = Column(String(20), default='mild')
    status = Column(String(20), default='pending')

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
