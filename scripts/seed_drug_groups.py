import asyncio
import sys
import os
import uuid

# Add backend and root to path so we can import from app and ml
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import AsyncSessionLocal
from app.models.drug_group import DrugGroup
from ml.data_pipeline import DRUG_TO_GROUP, DRUG_GROUPS

async def seed_drug_groups():
    async with AsyncSessionLocal() as db:
        print("Starting seed for drug_groups...")
        
        # We will parse drug groups from the DRUG_TO_GROUP dictionary in data_pipeline.py
        # Format: Category - Subcategory (e.g., Kháng sinh - Penicillin)
        
        added_count = 0
        for i, group_name in enumerate(DRUG_GROUPS):
            # Parse category
            parts = group_name.split(' - ')
            category = parts[0] if len(parts) > 0 else "Khác"
            
            # Auto-generate a dummy code
            code = f"ATC-MOCK-{str(uuid.uuid4())[:8].upper()}"
            
            # Find common drugs for this group
            common_drugs = [drug for drug, grp in DRUG_TO_GROUP.items() if grp == group_name]
            
            # Check if exists
            from sqlalchemy import select
            existing = await db.execute(select(DrugGroup).where(DrugGroup.name == group_name))
            if not existing.scalars().first():
                new_group = DrugGroup(
                    name=group_name,
                    code=code,
                    category=category,
                    description=f"Nhóm thuốc {group_name}",
                    common_drugs=common_drugs,
                    contraindications=[],
                    side_effects=[]
                )
                db.add(new_group)
                added_count += 1
                
        if added_count > 0:
            await db.commit()
            print(f"Successfully seeded {added_count} drug groups.")
        else:
            print("No new drug groups to seed. They already exist.")

if __name__ == "__main__":
    asyncio.run(seed_drug_groups())
