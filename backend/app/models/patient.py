import uuid
from datetime import datetime
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text, Uuid, JSON

from app.models.base import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_code = Column(String(20), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(10), nullable=False)
    phone = Column(String(15))
    address = Column(Text)
    blood_type = Column(String(5))
    allergies = Column(JSON)
    chronic_diseases = Column(JSON)
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
