from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.db.session import get_db
from app.models.drug_group import DrugGroup
from app.dependencies import require_admin

router = APIRouter()


class DrugGroupCreate(BaseModel):
    name: str
    code: str
    category: str
    description: Optional[str] = None
    common_drugs: Optional[List[str]] = None
    contraindications: Optional[List[str]] = None
    side_effects: Optional[List[str]] = None
    is_active: bool = True


class DrugGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    code: str
    category: str
    description: Optional[str] = None
    common_drugs: Optional[List[str]] = None
    contraindications: Optional[List[str]] = None
    side_effects: Optional[List[str]] = None
    is_active: bool
    created_at: Optional[datetime] = None


@router.get("", response_model=List[DrugGroupResponse])
async def get_drug_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DrugGroup).offset(skip).limit(limit))
    groups = result.scalars().all()
    return groups


@router.get("/{group_id}", response_model=DrugGroupResponse)
async def get_drug_group(group_id: UUID, db: AsyncSession = Depends(get_db)):
    group = await db.get(DrugGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Drug group not found")
    return group


@router.post("", status_code=201, response_model=DrugGroupResponse)
async def create_drug_group(
    data: DrugGroupCreate,
    db: AsyncSession = Depends(get_db),
    _admin: object = Depends(require_admin),
):
    group = DrugGroup(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.put("/{group_id}", response_model=DrugGroupResponse)
async def update_drug_group(
    group_id: UUID,
    data: DrugGroupCreate,
    db: AsyncSession = Depends(get_db),
    _admin: object = Depends(require_admin),
):
    group = await db.get(DrugGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Drug group not found")
    for key, value in data.model_dump().items():
        if hasattr(group, key):
            setattr(group, key, value)
    await db.commit()
    await db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=204)
async def delete_drug_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: object = Depends(require_admin),
):
    group = await db.get(DrugGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Drug group not found")
    await db.delete(group)
    await db.commit()
