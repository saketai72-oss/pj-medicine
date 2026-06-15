import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import get_db
from app.models.patient import Patient
from app.models.record import MedicalRecord
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

# Mock the database session
async def override_get_db():
    mock_session = MagicMock()
    
    # Mock behavior for User query
    mock_user = MagicMock()
    mock_user.id = uuid4()
    
    async def mock_execute(query):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_user
        mock_result.scalars.return_value.all.return_value = []
        return mock_result
        
    mock_session.execute = mock_execute
    
    async def mock_get(model, id):
        if model == Patient:
            p = MagicMock()
            p.id = id
            return p
        return None
        
    mock_session.get = mock_get
    
    async def mock_commit(): pass
    mock_session.commit = mock_commit
    
    async def mock_refresh(obj):
        from datetime import datetime
        obj.id = uuid4()
        obj.created_at = datetime.utcnow()
        obj.updated_at = datetime.utcnow()
        if hasattr(obj, 'created_by') and obj.created_by is None:
            obj.created_by = uuid4()
        if hasattr(obj, 'status') and obj.status is None:
            obj.status = 'pending'
            
    mock_session.refresh = mock_refresh
    
    yield mock_session

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def run_tests():
    print("Testing /api/health ...")
    response = client.get("/api/health")
    assert response.status_code == 200
    print("✅ Health check passed")

    print("\nTesting POST /api/v1/patients ...")
    patient_data = {
        "full_name": "Nguyen Van Test",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "phone": "0123456789"
    }
    response = client.post("/api/v1/patients", json=patient_data)
    if response.status_code == 201:
        print("✅ Create patient passed")
    else:
        print(f"❌ Failed: {response.json()}")

    print("\nTesting POST /api/v1/records ...")
    record_data = {
        "patient_id": str(uuid4()),
        "chief_complaint": "Đau đầu, ho dồn",
        "severity": "mild"
    }
    response = client.post("/api/v1/records", json=record_data)
    if response.status_code == 201:
        print("✅ Create record passed")
    else:
        print(f"❌ Failed: {response.json()}")

    print("\nTesting POST /api/v1/predictions/predict ...")
    predict_data = {
        "text": "Bệnh nhân sốt cao 39 độ, ho đờm",
        "top_k": 3
    }
    response = client.post("/api/v1/predictions/predict", json=predict_data)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Predict passed. Source: {data.get('source')}")
        print(f"   Results: {len(data.get('results'))} items")
    else:
        print(f"❌ Failed: {response.json()}")

if __name__ == "__main__":
    run_tests()
