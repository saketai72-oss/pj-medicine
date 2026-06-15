from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
import uuid

from app.db.session import get_db
from app.models import Patient, User
from app.schemas import PatientCreate, PatientResponse

router = APIRouter()

@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(patient_in: PatientCreate, db: AsyncSession = Depends(get_db)):
    # For now, generate a random code and assume a dummy created_by user
    patient_code = f"BN-{str(uuid.uuid4())[:8].upper()}"
    
    # Normally we get user from dependency `get_current_user`, but for now we query the first user or leave created_by as NULL
    # Let's mock a user if not exists or allow NULL
    user_query = await db.execute(select(User).limit(1))
    user = user_query.scalars().first()
    
    patient = Patient(
        **patient_in.model_dump(),
        patient_code=patient_code,
        created_by=user.id if user else None
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient

@router.get("", response_model=List[PatientResponse])
async def get_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    query = select(Patient).offset(skip).limit(limit)
    result = await db.execute(query)
    patients = result.scalars().all()
    return patients
