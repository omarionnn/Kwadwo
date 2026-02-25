"""
Integration tests for the FastAPI endpoints.

Uses FastAPI's TestClient (via httpx) so no real server is needed.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

# Import app after setting up env so dotenv doesn't break tests
import os
os.environ.setdefault("VAPI_API_KEY", "test-key")
os.environ.setdefault("VAPI_PHONE_NUMBER_ID", "test-phone-id")

from main import app
from app.orchestrator.session_store import _STORE
from app.models.call_models import CallSession, CallState


@pytest.fixture(autouse=True)
def clear_store():
    _STORE.clear()
    yield
    _STORE.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# ── Health endpoints ──────────────────────────────────────────────────────────

class TestHealthEndpoints:
    def test_root_returns_running(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "running"
        assert "Saafi" in data["service"]

    def test_health_returns_healthy(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


# ── Config endpoint ───────────────────────────────────────────────────────────

class TestConfigEndpoint:
    def test_returns_config_shape(self, client):
        resp = client.get("/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "phone_number" in data
        assert "assistant_id" in data
        assert "demo_ready" in data

    def test_demo_not_ready_without_setup(self, client):
        from main import _config
        original_phone = _config.get("phone_number")
        _config["phone_number"] = None
        try:
            resp = client.get("/config")
            # No /setup/vapi called, so demo_ready should be False
            assert resp.json()["demo_ready"] is False
        finally:
            _config["phone_number"] = original_phone


# ── Sessions endpoints ────────────────────────────────────────────────────────

class TestSessionsEndpoints:
    def test_list_sessions_empty(self, client):
        resp = client.get("/sessions")
        assert resp.status_code == 200
        assert resp.json()["sessions"] == []

    def test_list_sessions_returns_saved(self, client):
        import asyncio
        from app.orchestrator.session_store import save_session
        session = CallSession(call_id="ep-001", state=CallState.ENDED,
                              customer_name="Test User")
        asyncio.get_event_loop().run_until_complete(save_session(session))
        resp = client.get("/sessions")
        assert resp.status_code == 200
        sessions = resp.json()["sessions"]
        assert len(sessions) == 1
        assert sessions[0]["call_id"] == "ep-001"

    def test_get_session_by_id(self, client):
        import asyncio
        from app.orchestrator.session_store import save_session
        session = CallSession(call_id="ep-002", state=CallState.GREETING,
                              caller_number="+14045551234")
        asyncio.get_event_loop().run_until_complete(save_session(session))
        resp = client.get("/sessions/ep-002")
        assert resp.status_code == 200
        data = resp.json()
        assert data["call_id"] == "ep-002"
        assert data["caller_number"] == "+14045551234"

    def test_get_session_not_found_returns_404(self, client):
        resp = client.get("/sessions/nonexistent")
        assert resp.status_code == 404


# ── Vapi webhook endpoint ─────────────────────────────────────────────────────

class TestVapiWebhook:
    def test_call_start_returns_200(self, client):
        payload = {
            "type": "call-start",
            "call": {"id": "wh-001", "customer": {"number": "+14045551234"}}
        }
        resp = client.post("/vapi/webhook", json=payload)
        assert resp.status_code == 200

    def test_call_start_creates_session(self, client):
        import asyncio
        from app.orchestrator.session_store import get_session
        payload = {
            "type": "call-start",
            "call": {"id": "wh-002", "customer": {"number": "+14045550000"}}
        }
        client.post("/vapi/webhook", json=payload)
        session = asyncio.get_event_loop().run_until_complete(get_session("wh-002"))
        assert session is not None
        assert session.state == CallState.GREETING

    def test_function_call_book_service_appointment_returns_tool_result(self, client):
        # Start call first
        client.post("/vapi/webhook", json={
            "type": "call-start",
            "call": {"id": "wh-003", "customer": {"number": "+14045550001"}}
        })
        # Trigger booking tool call
        payload = {
            "type": "function-call",
            "call": {"id": "wh-003", "customer": {"number": "+14045550001"}},
            "functionCall": {
                "name": "book_service_appointment",
                "parameters": {
                    "customer_name": "Marcus Thompson",
                    "phone_number": "+14045550001",
                    "service_type": "Oil Change",
                    "preferred_time": "Thursday at 9 AM",
                }
            }
        }
        resp = client.post("/vapi/webhook", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "result" in data
        assert data["result"]["success"] is True

    def test_webhook_unknown_event_type_returns_200(self, client):
        """
        The webhook must always return 200 to Vapi, even for unrecognised event types.
        Returning a 4xx causes Vapi to retry the webhook indefinitely.
        Our handler logs a warning and returns {} gracefully.
        """
        payload = {
            "message": {
                "type": "not-a-real-event",
                "call": {"id": "wh-bad"}
            }
        }
        resp = client.post("/vapi/webhook", json=payload)
        assert resp.status_code == 200

    def test_call_end_sets_session_to_ended(self, client):
        import asyncio
        from app.orchestrator.session_store import get_session
        client.post("/vapi/webhook", json={
            "type": "call-start",
            "call": {"id": "wh-004", "customer": {"number": "+14045550002"}}
        })
        client.post("/vapi/webhook", json={
            "type": "call-end",
            "call": {
                "id": "wh-004",
                "customer": {"number": "+14045550002"},
                "endedReason": "customer-ended-call",
                "cost": 0.003,
                "duration": 90.0
            }
        })
        session = asyncio.get_event_loop().run_until_complete(get_session("wh-004"))
        assert session.state == CallState.ENDED
        assert session.cost_usd == pytest.approx(0.003)


# ── Webhook edge cases ───────────────────────────────────────────────────────

class TestWebhookEdgeCases:
    def test_modern_tool_calls_returns_results(self, client):
        """Modern tool-calls format via the webhook endpoint returns a results array."""
        client.post("/vapi/webhook", json={
            "type": "call-start",
            "call": {"id": "wh-tc-001", "customer": {"number": "+14045550010"}}
        })
        resp = client.post("/vapi/webhook", json={
            "type": "tool-calls",
            "call": {"id": "wh-tc-001", "customer": {"number": "+14045550010"}},
            "toolCallList": [{
                "id": "tc-edge-1",
                "type": "function",
                "function": {
                    "name": "book_service_appointment",
                    "arguments": {
                        "customer_name": "Edge Test",
                        "phone_number": "+14045550010",
                        "service_type": "General Maintenance",
                        "preferred_time": "Monday morning",
                    },
                },
            }],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert data["results"][0]["toolCallId"] == "tc-edge-1"

    def test_transcript_webhook_appends_to_session(self, client):
        import asyncio
        from app.orchestrator.session_store import get_session
        client.post("/vapi/webhook", json={
            "type": "call-start",
            "call": {"id": "wh-tr-001", "customer": {"number": "+14045550020"}}
        })
        client.post("/vapi/webhook", json={
            "type": "transcript",
            "call": {"id": "wh-tr-001", "customer": {"number": "+14045550020"}},
            "role": "user",
            "transcript": "I need an oil change.",
            "transcriptType": "final",
        })
        session = asyncio.get_event_loop().run_until_complete(get_session("wh-tr-001"))
        assert len(session.transcript) == 1
        assert session.transcript[0]["text"] == "I need an oil change."

    def test_partial_transcript_ignored(self, client):
        import asyncio
        from app.orchestrator.session_store import get_session
        client.post("/vapi/webhook", json={
            "type": "call-start",
            "call": {"id": "wh-tr-002", "customer": {"number": "+14045550030"}}
        })
        client.post("/vapi/webhook", json={
            "type": "transcript",
            "call": {"id": "wh-tr-002", "customer": {"number": "+14045550030"}},
            "role": "user",
            "transcript": "I need",
            "transcriptType": "partial",
        })
        session = asyncio.get_event_loop().run_until_complete(get_session("wh-tr-002"))
        assert session.transcript == []

    def test_debug_last_payload_returns_dict(self, client):
        resp = client.get("/debug/last-payload")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)

    def test_multiple_sessions_listed(self, client):
        import asyncio
        from app.orchestrator.session_store import save_session
        for i in range(5):
            s = CallSession(call_id=f"multi-{i}", state=CallState.ENDED)
            asyncio.get_event_loop().run_until_complete(save_session(s))
        resp = client.get("/sessions")
        assert resp.status_code == 200
        sessions = resp.json()["sessions"]
        assert len(sessions) == 5

    def test_webhook_with_message_envelope(self, client):
        """Vapi sometimes wraps the event inside a 'message' key."""
        resp = client.post("/vapi/webhook", json={
            "message": {
                "type": "call-start",
                "call": {"id": "wh-env-001", "customer": {"number": "+14045550040"}}
            }
        })
        assert resp.status_code == 200

    def test_agent_routes_mounted(self, client):
        """Verify /api/agent route exists (will fail auth but responds)."""
        original = os.environ.get("VAPI_ASSISTANT_ID", "")
        os.environ["VAPI_ASSISTANT_ID"] = ""
        try:
            resp = client.get("/api/agent")
            # Should get 500 because VAPI_ASSISTANT_ID is empty, NOT 404
            assert resp.status_code == 500
        finally:
            os.environ["VAPI_ASSISTANT_ID"] = original
