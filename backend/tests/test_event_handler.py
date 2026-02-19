"""
Integration tests for the Vapi event handler state machine.

Tests the full lifecycle: call-start → transcript → function-calls → call-end
and verifies that CallSession state transitions happen correctly.
"""

import pytest
from app.models.call_models import CallState, CallSession, VapiMessage, VapiEventType
from app.orchestrator.event_handler import handle_vapi_event
from app.orchestrator.session_store import get_session, _STORE


@pytest.fixture(autouse=True)
def clear_store():
    _STORE.clear()
    yield
    _STORE.clear()


def _make_message(event_type: str, call_id: str = "test-call", **kwargs) -> VapiMessage:
    """Helper to build a VapiMessage for testing."""
    base = {
        "type": event_type,
        "call": {"id": call_id, "customer": {"number": "+14045551234"}},
    }
    base.update(kwargs)
    return VapiMessage.model_validate(base)


# ── call-start ────────────────────────────────────────────────────────────────

class TestCallStarted:
    async def test_creates_session_in_greeting_state(self):
        msg = _make_message("call-start")
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session is not None
        assert session.state == CallState.GREETING

    async def test_stores_caller_number(self):
        msg = _make_message("call-start")
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.caller_number == "+14045551234"

    async def test_returns_empty_dict(self):
        msg = _make_message("call-start")
        result = await handle_vapi_event(msg)
        assert result == {}


# ── transcript ────────────────────────────────────────────────────────────────

class TestTranscript:
    async def test_partial_transcripts_ignored(self):
        _STORE.clear()
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "transcript",
            role="user",
            transcript="I need",
            transcriptType="partial",
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.transcript == []  # partial not appended

    async def test_final_transcripts_appended(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "transcript",
            role="user",
            transcript="I need an appointment.",
            transcriptType="final",
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert len(session.transcript) == 1
        assert session.transcript[0]["text"] == "I need an appointment."

    async def test_user_transcript_moves_greeting_to_identifying(self):
        await handle_vapi_event(_make_message("call-start"))
        await handle_vapi_event(_make_message(
            "transcript", role="user",
            transcript="Hi, I need to schedule service.",
            transcriptType="final"
        ))
        session = await get_session("test-call")
        assert session.state == CallState.IDENTIFYING

    async def test_vin_in_transcript_moves_to_looking_up(self):
        await handle_vapi_event(_make_message("call-start"))
        # First move to IDENTIFYING
        await handle_vapi_event(_make_message(
            "transcript", role="user",
            transcript="Hi I need an appointment",
            transcriptType="final"
        ))
        # Then provide VIN
        await handle_vapi_event(_make_message(
            "transcript", role="user",
            transcript="My VIN ends in 4872.",
            transcriptType="final"
        ))
        session = await get_session("test-call")
        assert session.state == CallState.LOOKING_UP
        assert session.vin_last4 == "4872"


# ── function-call ─────────────────────────────────────────────────────────────

class TestFunctionCall:
    async def test_lookup_vehicle_found_moves_to_offering_slots(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "function-call",
            functionCall={"name": "lookup_vehicle", "parameters": {"vin_last4": "4872"}},
        )
        result = await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.state == CallState.OFFERING_SLOTS
        assert session.vehicle_id == "v-4872"
        assert session.customer_name == "Marcus Thompson"
        # Returns ToolResult to Vapi
        assert "result" in result
        assert result["result"]["found"] is True

    async def test_lookup_vehicle_not_found_does_not_advance_state(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "function-call",
            functionCall={"name": "lookup_vehicle", "parameters": {"vin_last4": "9999"}},
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        # Should remain in GREETING (no state advance on failure)
        assert session.state not in (CallState.OFFERING_SLOTS, CallState.IDENTIFYING)

    async def test_get_availability_moves_to_confirming(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "function-call",
            functionCall={"name": "get_availability", "parameters": {"vehicle_id": "v-4872"}},
        )
        result = await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.state == CallState.CONFIRMING
        assert "result" in result
        assert "available_slots" in result["result"]

    async def test_book_appointment_moves_to_closing(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "function-call",
            functionCall={
                "name": "book_appointment",
                "parameters": {
                    "vehicle_id": "v-4872",
                    "slot_id": "slot-test-001",
                    "customer_name": "Marcus Thompson",
                }
            },
        )
        result = await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.state == CallState.CLOSING
        assert session.appointment_id is not None
        assert result["result"]["success"] is True

    async def test_missing_function_call_payload_returns_error(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message("function-call")  # no functionCall field
        result = await handle_vapi_event(msg)
        assert "result" in result
        assert "error" in result["result"]

    async def test_unknown_tool_returns_error_result(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "function-call",
            functionCall={"name": "nonexistent", "parameters": {}},
        )
        result = await handle_vapi_event(msg)
        assert "error" in result["result"]


# ── call-end ──────────────────────────────────────────────────────────────────

class TestCallEnded:
    async def test_sets_state_to_ended(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "call-end",
            call={
                "id": "test-call",
                "customer": {"number": "+14045551234"},
                "endedReason": "customer-ended-call",
                "cost": 0.0038,
                "duration": 127.0,
            },
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.state == CallState.ENDED
        assert session.ended_reason == "customer-ended-call"
        assert session.cost_usd == pytest.approx(0.0038)
        assert session.duration_seconds == pytest.approx(127.0)

    async def test_ended_returns_empty_dict(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "call-end",
            call={
                "id": "test-call",
                "customer": {"number": "+14045551234"},
                "endedReason": "no-answer",
                "cost": None,
                "duration": None,
            },
        )
        result = await handle_vapi_event(msg)
        assert result == {}


# ── full lifecycle integration test ──────────────────────────────────────────

class TestFullLifecycle:
    async def test_complete_booking_flow(self):
        """Simulate a complete call from start to booking confirmation."""
        call_id = "lifecycle-test"

        def msg(event_type, **kwargs):
            return _make_message(event_type, call_id=call_id, **kwargs)

        # 1. Call starts
        await handle_vapi_event(msg("call-start"))
        s = await get_session(call_id)
        assert s.state == CallState.GREETING

        # 2. Customer speaks
        await handle_vapi_event(msg("transcript", role="user",
            transcript="need appointment", transcriptType="final"))
        s = await get_session(call_id)
        assert s.state == CallState.IDENTIFYING

        # 3. Vehicle lookup
        await handle_vapi_event(msg("function-call",
            functionCall={"name": "lookup_vehicle", "parameters": {"vin_last4": "3391"}}))
        s = await get_session(call_id)
        assert s.state == CallState.OFFERING_SLOTS
        assert s.vehicle_id == "v-3391"

        # 4. Get availability
        await handle_vapi_event(msg("function-call",
            functionCall={"name": "get_availability",
                          "parameters": {"vehicle_id": "v-3391", "service_type": "brake_inspection"}}))
        s = await get_session(call_id)
        assert s.state == CallState.CONFIRMING

        # 5. Book it
        result = await handle_vapi_event(msg("function-call",
            functionCall={"name": "book_appointment",
                          "parameters": {"vehicle_id": "v-3391", "slot_id": "slot-lc",
                                         "customer_name": "Sarah Mitchell"}}))
        s = await get_session(call_id)
        assert s.state == CallState.CLOSING
        assert s.appointment_id is not None
        assert result["result"]["success"] is True

        # 6. Call ends
        await handle_vapi_event(msg("call-end",
            call={"id": call_id, "customer": {"number": "+14045550293"},
                  "endedReason": "customer-ended-call", "cost": 0.004, "duration": 156}))
        s = await get_session(call_id)
        assert s.state == CallState.ENDED
        assert s.cost_usd == pytest.approx(0.004)
