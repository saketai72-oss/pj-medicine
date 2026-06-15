import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Uuid, JSON

from app.models.base import Base

class DrugGroup(Base):
    __tablename__ = "drug_groups"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text)
    common_drugs = Column(JSON)
    contraindications = Column(JSON)
    side_effects = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
