"""
Tests for the Agent Builder API routes (/api/agent GET and PATCH).

Mocks all Vapi HTTP calls so no real API requests are made.
"""

import pytest
import os
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

os.environ.setdefault("VAPI_API_KEY", "test-key")
os.environ.setdefault("VAPI_PHONE_NUMBER_ID", "test-phone-id")
os.environ.setdefault("VAPI_ASSISTANT_ID", "test-assistant-id-1234")

from main import app
from app.api.agent_routes import _extract_config


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# ── Sample Vapi response for mocking ─────────────────────────────────────────

MOCK_VAPI_ASSISTANT = {
    "id": "test-assistant-id-1234",
    "name": "Sofia — Westside Auto",
    "firstMessage": "Hi, thanks for calling!",
    "voice": {"provider": "openai", "voiceId": "nova"},
    "model": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.5,
        "messages": [
            {"role": "system", "content": "You are Sofia, a service advisor."}
        ],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "book_service_appointment",
                    "description": "Book a service appointment.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "customer_name": {"type": "string", "description": "Name"},
                            "phone_number": {"type": "string", "description": "Phone"},
                            "service_type": {"type": "string", "description": "Service"},
                            "preferred_time": {"type": "string", "description": "Time"},
                        },
                        "required": ["customer_name", "phone_number", "service_type", "preferred_time"],
                    },
                },
            }
        ],
    },
    "serverUrl": "https://example.com/vapi/webhook",
}


def _mock_response(status_code=200, json_data=None):
    """Create a mock httpx.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or MOCK_VAPI_ASSISTANT
    resp.text = str(json_data or MOCK_VAPI_ASSISTANT)
    return resp


# ── _extract_config helper ───────────────────────────────────────────────────

class TestExtractConfig:
    def test_extracts_id_and_name(self):
        config = _extract_config(MOCK_VAPI_ASSISTANT)
        assert config.id == "test-assistant-id-1234"
        assert config.name == "Sofia — Westside Auto"

    def test_extracts_first_message(self):
        config = _extract_config(MOCK_VAPI_ASSISTANT)
        assert config.firstMessage == "Hi, thanks for calling!"

    def test_extracts_system_prompt(self):
        config = _extract_config(MOCK_VAPI_ASSISTANT)
        assert "Sofia" in config.systemPrompt

    def test_extracts_model_and_temperature(self):
        config = _extract_config(MOCK_VAPI_ASSISTANT)
        assert config.model == "gpt-4o"
        assert config.temperature == 0.5

    def test_extracts_voice(self):
        config = _extract_config(MOCK_VAPI_ASSISTANT)
        assert config.voice.provider == "openai"
        assert config.voice.voiceId == "nova"

    def test_extracts_tools(self):
        config = _extract_config(MOCK_VAPI_ASSISTANT)
        assert len(config.tools) == 1
        assert config.tools[0].function.name == "book_service_appointment"
        assert len(config.tools[0].function.parameters.required) == 4

    def test_handles_empty_tools(self):
        data = {**MOCK_VAPI_ASSISTANT, "model": {**MOCK_VAPI_ASSISTANT["model"], "tools": []}}
        config = _extract_config(data)
        assert config.tools == []

    def test_handles_missing_system_prompt(self):
        data = {**MOCK_VAPI_ASSISTANT, "model": {**MOCK_VAPI_ASSISTANT["model"], "messages": []}}
        config = _extract_config(data)
        assert config.systemPrompt == ""

    def test_handles_missing_voice(self):
        data = {**MOCK_VAPI_ASSISTANT}
        del data["voice"]
        config = _extract_config(data)
        assert config.voice.provider == ""
        assert config.voice.voiceId == ""


# ── GET /api/agent ───────────────────────────────────────────────────────────

class TestGetAgent:
    @patch("app.api.agent_routes.httpx.AsyncClient")
    def test_returns_agent_config(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client_cls.return_value = mock_client

        resp = client.get("/api/agent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Sofia — Westside Auto"
        assert data["model"] == "gpt-4o"

    @patch("app.api.agent_routes.httpx.AsyncClient")
    def test_returns_error_when_vapi_fails(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(500, {"error": "Server error"}))
        mock_client_cls.return_value = mock_client

        resp = client.get("/api/agent")
        assert resp.status_code == 500

    def test_returns_500_when_assistant_id_missing(self, client):
        original = os.environ.get("VAPI_ASSISTANT_ID")
        os.environ["VAPI_ASSISTANT_ID"] = ""
        try:
            resp = client.get("/api/agent")
            assert resp.status_code == 500
        finally:
            if original:
                os.environ["VAPI_ASSISTANT_ID"] = original


# ── PATCH /api/agent ─────────────────────────────────────────────────────────

class TestPatchAgent:
    @patch("app.api.agent_routes.httpx.AsyncClient")
    def test_patch_name(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client.patch = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client_cls.return_value = mock_client

        resp = client.patch("/api/agent", json={"name": "New Name"})
        assert resp.status_code == 200
        # Verify that both get (fetch current) and patch were called
        mock_client.get.assert_called_once()
        mock_client.patch.assert_called_once()

    @patch("app.api.agent_routes.httpx.AsyncClient")
    def test_patch_system_prompt_nests_in_model(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client.patch = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client_cls.return_value = mock_client

        resp = client.patch("/api/agent", json={"systemPrompt": "New prompt"})
        assert resp.status_code == 200
        # Check the actual json sent to Vapi
        call_kwargs = mock_client.patch.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        assert "model" in payload
        assert payload["model"]["messages"][0]["content"] == "New prompt"
        # Verify tools are preserved from the fetched config
        assert "tools" in payload["model"]

    @patch("app.api.agent_routes.httpx.AsyncClient")
    def test_patch_voice(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client.patch = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client_cls.return_value = mock_client

        resp = client.patch("/api/agent", json={"voiceId": "shimmer"})
        assert resp.status_code == 200

    @patch("app.api.agent_routes.httpx.AsyncClient")
    def test_patch_empty_body_returns_400(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client_cls.return_value = mock_client

        resp = client.patch("/api/agent", json={})
        assert resp.status_code == 400

    @patch("app.api.agent_routes.httpx.AsyncClient")
    def test_patch_temperature(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client.patch = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client_cls.return_value = mock_client

        resp = client.patch("/api/agent", json={"temperature": 0.8})
        assert resp.status_code == 200
        call_kwargs = mock_client.patch.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        assert payload["model"]["temperature"] == 0.8
        # Verify tools are preserved
        assert "tools" in payload["model"]

    @patch("app.api.agent_routes.httpx.AsyncClient")
    def test_patch_returns_error_when_vapi_rejects(self, mock_client_cls, client):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(200, MOCK_VAPI_ASSISTANT))
        mock_client.patch = AsyncMock(return_value=_mock_response(400, {"error": "bad"}))
        mock_client_cls.return_value = mock_client

        resp = client.patch("/api/agent", json={"name": "fail"})
        assert resp.status_code == 400

