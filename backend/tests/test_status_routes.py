"""
Tests for the Status API route (/api/status).

Mocks UptimeRobot HTTP calls so no real API requests are made.
"""

import pytest
import os
import time
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

os.environ.setdefault("VAPI_API_KEY", "test-key")
os.environ.setdefault("VAPI_PHONE_NUMBER_ID", "test-phone-id")
os.environ.setdefault("VAPI_ASSISTANT_ID", "test-assistant-id-1234")
os.environ.setdefault("UPTIMEROBOT_API_KEY", "test-uptimerobot-key")

from main import app
from app.api import status_routes


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the status cache before each test."""
    status_routes._cache["data"] = None
    status_routes._cache["expires"] = 0
    yield


# ── Sample UptimeRobot response ──────────────────────────────────────────────

MOCK_UPTIMEROBOT_RESPONSE = {
    "stat": "ok",
    "monitors": [
        {
            "id": 123456,
            "friendly_name": "Saafi Backend",
            "url": "https://saafi-backend.onrender.com/health",
            "status": 2,
            "custom_uptime_ratio": "99.95-99.90-99.85",
            "response_times": [{"value": 205}],
            "last_check": "2026-02-23T12:00:00Z",
        }
    ],
}


def _mock_response(status_code=200, json_data=None):
    """Create a mock httpx.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or MOCK_UPTIMEROBOT_RESPONSE
    resp.raise_for_status = MagicMock()
    return resp


# ── Tests ────────────────────────────────────────────────────────────────────

class TestGetStatus:
    @patch("app.api.status_routes.httpx.AsyncClient")
    def test_returns_monitor_data(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=_mock_response(200, MOCK_UPTIMEROBOT_RESPONSE))
        mock_client_cls.return_value = mock_client

        resp = client.get("/api/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "monitors" in data
        assert len(data["monitors"]) == 1
        assert data["monitors"][0]["name"] == "Saafi Backend"
        assert data["monitors"][0]["status"] == "Operational"
        assert data["monitors"][0]["statusColor"] == "green"

    @patch("app.api.status_routes.httpx.AsyncClient")
    def test_returns_uptime_ratios(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=_mock_response(200, MOCK_UPTIMEROBOT_RESPONSE))
        mock_client_cls.return_value = mock_client

        resp = client.get("/api/status")
        data = resp.json()
        monitor = data["monitors"][0]
        assert monitor["uptimeDay"] == 99.95
        assert monitor["uptimeWeek"] == 99.90
        assert monitor["uptimeMonth"] == 99.85
        assert monitor["responseTime"] == 205

    @patch("app.api.status_routes.httpx.AsyncClient")
    def test_returns_cached_data_on_second_call(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=_mock_response(200, MOCK_UPTIMEROBOT_RESPONSE))
        mock_client_cls.return_value = mock_client

        # First call — hits API
        resp1 = client.get("/api/status")
        assert resp1.status_code == 200
        # Second call — should use cache, not call API again
        resp2 = client.get("/api/status")
        assert resp2.status_code == 200
        # API should only be called once
        mock_client.post.assert_called_once()

    @patch("app.api.status_routes.httpx.AsyncClient")
    def test_maps_status_codes_correctly(self, mock_client_cls, client):
        down_response = {
            "stat": "ok",
            "monitors": [{
                "id": 1, "friendly_name": "Test", "url": "http://test.com",
                "status": 9, "custom_uptime_ratio": "50-60-70",
                "response_times": [], "last_check": None,
            }],
        }
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=_mock_response(200, down_response))
        mock_client_cls.return_value = mock_client

        resp = client.get("/api/status")
        data = resp.json()
        assert data["monitors"][0]["status"] == "Down"
        assert data["monitors"][0]["statusColor"] == "red"

    def test_returns_500_when_api_key_missing(self, client):
        original = os.environ.get("UPTIMEROBOT_API_KEY")
        os.environ["UPTIMEROBOT_API_KEY"] = ""
        try:
            resp = client.get("/api/status")
            assert resp.status_code == 500
        finally:
            if original:
                os.environ["UPTIMEROBOT_API_KEY"] = original

    @patch("app.api.status_routes.httpx.AsyncClient")
    def test_returns_502_when_uptimerobot_fails(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=Exception("Connection timed out"))
        mock_client_cls.return_value = mock_client

        resp = client.get("/api/status")
        assert resp.status_code == 502

    @patch("app.api.status_routes.httpx.AsyncClient")
    def test_returns_502_when_uptimerobot_returns_error(self, mock_client_cls, client):
        error_response = {"stat": "fail", "error": {"message": "Invalid API key"}}
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=_mock_response(200, error_response))
        mock_client_cls.return_value = mock_client

        resp = client.get("/api/status")
        assert resp.status_code == 502
