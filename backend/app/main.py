"""
Drug-Pred AI — FastAPI Backend
Hệ thống dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: load ML model, connect DB, etc.
    print("🚀 Drug-Pred AI Backend starting...")
    from app.db.session import engine, Base
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.record import MedicalRecord
    from app.models.drug_group import DrugGroup
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import select
    import uuid

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).limit(1))
        first_user = result.scalars().first()
        if not first_user:
            dummy_user = User(
                username="admin",
                email="admin@example.com",
                password_hash="hashed_password",
                full_name="Admin User",
                role="admin"
            )
            session.add(dummy_user)
            await session.commit()
    yield
    # Shutdown: cleanup
    print("👋 Drug-Pred AI Backend shutting down...")


app = FastAPI(
    title="Drug-Pred AI",
    description="API hỗ trợ dự đoán nhóm thuốc từ mô tả bệnh án tiếng Việt",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — cho phép Frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health Check ---
@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "drug-pred-ai",
        "version": "0.1.0",
    }


# --- Import routers here ---
from app.api import patients_router, records_router, predictions_router
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(patients_router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(records_router, prefix="/api/v1/records", tags=["Medical Records"])
app.include_router(predictions_router, prefix="/api/v1/predictions", tags=["Predictions"])
