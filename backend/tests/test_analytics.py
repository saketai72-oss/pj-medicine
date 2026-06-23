import pytest
from unittest.mock import MagicMock


# ---------------------------------------------------------------------------
# Helper: build a mock DB session whose execute() returns sensible values
# for all analytics queries (scalar counts, list rows, fetchone rows).
# ---------------------------------------------------------------------------

def _make_analytics_mock_session():
    mock_session = MagicMock()

    async def mock_execute(query, *args, **kwargs):
        mock_result = MagicMock()
        mock_result.scalar.return_value = 10
        mock_result.all.return_value = [("mild", 5), ("moderate", 3)]
        mock_result.scalars.return_value.first.return_value = None
        mock_result.scalars.return_value.all.return_value = []
        mock_result.fetchone.return_value = None
        return mock_result

    mock_session.execute = mock_execute

    async def mock_commit():
        pass

    mock_session.commit = mock_commit
    return mock_session


# ---------------------------------------------------------------------------
# Tests for GET /api/analytics/overview
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analytics_overview_returns_200(client):
    response = await client.get("/api/analytics/overview")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_analytics_overview_has_required_keys(client):
    response = await client.get("/api/analytics/overview")
    data = response.json()
    assert "total_predictions" in data
    assert "total_patients" in data
    assert "total_records" in data
    assert "total_drug_groups" in data


@pytest.mark.asyncio
async def test_analytics_overview_values_are_non_negative(client):
    response = await client.get("/api/analytics/overview")
    data = response.json()
    assert data["total_predictions"] >= 0
    assert data["total_patients"] >= 0
    assert data["total_records"] >= 0
    assert data["total_drug_groups"] >= 0


# ---------------------------------------------------------------------------
# Tests for GET /api/analytics/predictions/summary
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_predictions_summary_returns_200(client):
    response = await client.get("/api/analytics/predictions/summary")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_predictions_summary_has_required_keys(client):
    response = await client.get("/api/analytics/predictions/summary")
    data = response.json()
    assert "total_predictions" in data
    assert "average_confidence" in data


@pytest.mark.asyncio
async def test_predictions_summary_total_is_non_negative(client):
    response = await client.get("/api/analytics/predictions/summary")
    data = response.json()
    assert data["total_predictions"] >= 0


@pytest.mark.asyncio
async def test_predictions_summary_confidence_is_float(client):
    response = await client.get("/api/analytics/predictions/summary")
    data = response.json()
    assert isinstance(data["average_confidence"], (int, float))


# ---------------------------------------------------------------------------
# Tests for GET /api/analytics/records/severity
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_records_severity_returns_200(client):
    response = await client.get("/api/analytics/records/severity")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_records_severity_returns_list(client):
    response = await client.get("/api/analytics/records/severity")
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_records_severity_items_have_severity_and_count(client):
    response = await client.get("/api/analytics/records/severity")
    data = response.json()
    for item in data:
        assert "severity" in item
        assert "count" in item


# ---------------------------------------------------------------------------
# Tests for GET /api/analytics/records/status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_records_status_returns_200(client):
    response = await client.get("/api/analytics/records/status")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_records_status_returns_list(client):
    response = await client.get("/api/analytics/records/status")
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_records_status_items_have_status_and_count(client):
    response = await client.get("/api/analytics/records/status")
    data = response.json()
    for item in data:
        assert "status" in item
        assert "count" in item
