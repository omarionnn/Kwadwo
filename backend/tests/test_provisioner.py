"""
Tests for the Vapi provisioner module.

Mocks all httpx calls so no real Vapi API requests are made.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from app.vapi.provisioner import (
    create_assistant,
    assign_phone_number,
    get_phone_number_info,
    SYSTEM_PROMPT,
    FIRST_MESSAGE,
    TOOLS,
)


def _mock_response(status_code=200, json_data=None, text=""):
    """Create a mock httpx.Response."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    resp.text = text or str(json_data or {})
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            message=f"{status_code} error",
            request=MagicMock(),
            response=resp,
        )
    return resp


# ── SYSTEM_PROMPT and TOOLS constants ────────────────────────────────────────

class TestProvisionerConstants:
    def test_system_prompt_is_non_empty(self):
        assert len(SYSTEM_PROMPT.strip()) > 100

    def test_system_prompt_mentions_sofia(self):
        assert "Sofia" in SYSTEM_PROMPT

    def test_system_prompt_mentions_westside_auto(self):
        assert "Westside Auto" in SYSTEM_PROMPT

    def test_system_prompt_has_anti_hallucination_rule(self):
        assert "Never assume" in SYSTEM_PROMPT or "never assume" in SYSTEM_PROMPT.lower()

    def test_first_message_is_non_empty(self):
        assert len(FIRST_MESSAGE.strip()) > 10

    def test_first_message_mentions_sofia(self):
        assert "Sofia" in FIRST_MESSAGE

    def test_tools_contains_book_service_appointment(self):
        assert len(TOOLS) == 1
        assert TOOLS[0]["function"]["name"] == "book_service_appointment"

    def test_tool_has_all_required_params(self):
        params = TOOLS[0]["function"]["parameters"]
        required = params["required"]
        assert "customer_name" in required
        assert "phone_number" in required
        assert "service_type" in required
        assert "preferred_time" in required

    def test_tool_has_descriptions_for_all_params(self):
        props = TOOLS[0]["function"]["parameters"]["properties"]
        for param_name, param_def in props.items():
            assert "description" in param_def, f"Missing description for {param_name}"
            assert len(param_def["description"]) > 5


# ── create_assistant ─────────────────────────────────────────────────────────

class TestCreateAssistant:
    @pytest.mark.asyncio
    @patch("app.vapi.provisioner.httpx.AsyncClient")
    async def test_sends_correct_payload(self, mock_client_cls):
        mock_client = AsyncMock()
        mock_resp = _mock_response(200, {"id": "ast-123", "name": "Sofia"})
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await create_assistant("fake-key", "https://my-server.com")
        assert result["id"] == "ast-123"

        # Verify the payload sent to Vapi
        call_kwargs = mock_client.post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        assert payload["name"] == "Sofia - Service Appointment Agent"
        assert payload["serverUrl"] == "https://my-server.com/vapi/webhook"
        assert payload["firstMessage"] == FIRST_MESSAGE
        assert "model" in payload
        assert "voice" in payload
        assert "transcriber" in payload

    @pytest.mark.asyncio
    @patch("app.vapi.provisioner.httpx.AsyncClient")
    async def test_includes_server_messages(self, mock_client_cls):
        mock_client = AsyncMock()
        mock_resp = _mock_response(200, {"id": "ast-456"})
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        await create_assistant("fake-key", "https://test.com")
        call_kwargs = mock_client.post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        msgs = payload["serverMessages"]
        assert "end-of-call-report" in msgs
        assert "tool-calls" in msgs
        assert "transcript" in msgs

    @pytest.mark.asyncio
    @patch("app.vapi.provisioner.httpx.AsyncClient")
    async def test_raises_on_400(self, mock_client_cls):
        mock_client = AsyncMock()
        mock_resp = _mock_response(400, text="Bad Request")
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(httpx.HTTPStatusError):
            await create_assistant("fake-key", "https://test.com")

    @pytest.mark.asyncio
    @patch("app.vapi.provisioner.httpx.AsyncClient")
    async def test_raises_on_401_unauthorized(self, mock_client_cls):
        mock_client = AsyncMock()
        mock_resp = _mock_response(401, text="Unauthorized")
        mock_client.post = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(httpx.HTTPStatusError):
            await create_assistant("bad-key", "https://test.com")


# ── assign_phone_number ──────────────────────────────────────────────────────

class TestAssignPhoneNumber:
    @pytest.mark.asyncio
    @patch("app.vapi.provisioner.httpx.AsyncClient")
    async def test_sends_assistant_id(self, mock_client_cls):
        mock_client = AsyncMock()
        mock_resp = _mock_response(200, {"id": "phone-1", "number": "+14045551234"})
        mock_client.patch = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await assign_phone_number("key", "phone-1", "ast-123")
        assert result["number"] == "+14045551234"

        call_kwargs = mock_client.patch.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")
        assert payload["assistantId"] == "ast-123"

    @pytest.mark.asyncio
    @patch("app.vapi.provisioner.httpx.AsyncClient")
    async def test_raises_on_400(self, mock_client_cls):
        mock_client = AsyncMock()
        mock_resp = _mock_response(400, text="assistantId must be a UUID")
        mock_client.patch = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        with pytest.raises(httpx.HTTPStatusError):
            await assign_phone_number("key", "phone-1", "bad-id")


# ── get_phone_number_info ────────────────────────────────────────────────────

class TestGetPhoneNumberInfo:
    @pytest.mark.asyncio
    @patch("app.vapi.provisioner.httpx.AsyncClient")
    async def test_returns_phone_data(self, mock_client_cls):
        mock_client = AsyncMock()
        mock_resp = _mock_response(200, {"id": "phone-1", "number": "+18627819115"})
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client_cls.return_value = mock_client

        result = await get_phone_number_info("key", "phone-1")
        assert result["number"] == "+18627819115"
