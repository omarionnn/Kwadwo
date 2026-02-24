"""
Integration tests for the Vapi event handler state machine.

Tests the full lifecycle: call-start → transcript → function-calls → call-end
and verifies that CallSession state transitions happen correctly.
"""

import pytest
from app.models.call_models import CallState, CallSession, VapiMessage, VapiEventType, VapiCall
from app.orchestrator.event_handler import handle_vapi_event
from app.orchestrator.session_store import get_session, _STORE


@pytest.fixture(autouse=True)
def clear_store():
    _STORE.clear()
    yield
    _STORE.clear()


def _make_message(event_type: str, call_id: str = "test-call", **kwargs) -> VapiMessage:
    """Helper to build a VapiMessage for testing."""
    # Tests might pass 'call' or 'call_kwargs' — normalize to 'call_kwargs'
    call_kwargs = kwargs.pop("call_kwargs", {})
    if not call_kwargs:
        call_kwargs = kwargs.pop("call", {})

    if "id" not in call_kwargs:
        call_kwargs["id"] = call_id

    if "customer" not in call_kwargs:
        call_kwargs["customer"] = {"number": "+14045551234"}

    call_obj = VapiCall(**call_kwargs)
    # Ensure model_extra is an empty dict if not set, for consistent behavior
    if call_obj.model_extra is None:
        call_obj.model_extra = {}
    
    return VapiMessage(type=event_type, call=call_obj, **kwargs)


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

    async def test_user_name_in_transcript_stays_identifying(self):
        """Providing a name doesn't change state — Sofia asks for phone + time too."""
        await handle_vapi_event(_make_message("call-start"))
        await handle_vapi_event(_make_message(
            "transcript", role="user",
            transcript="Hi I need an appointment",
            transcriptType="final"
        ))
        # Provide name — state should still be IDENTIFYING
        await handle_vapi_event(_make_message(
            "transcript", role="user",
            transcript="My name is Marcus Thompson.",
            transcriptType="final"
        ))
        session = await get_session("test-call")
        # Still IDENTIFYING — booking only happens when tool fires
        assert session.state == CallState.IDENTIFYING


# ── function-call ─────────────────────────────────────────────────────────────

    async def test_book_service_appointment_moves_to_closing(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "function-call",
            functionCall={
                "name": "book_service_appointment",
                "parameters": {
                    "customer_name": "Marcus Thompson",
                    "phone_number": "+14045551234",
                    "service_type": "Oil Change",
                    "preferred_time": "Thursday morning at 9 AM",
                }
            },
        )
        result = await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.state == CallState.CLOSING
        assert session.appointment_id is not None
        assert session.customer_name == "Marcus Thompson"
        assert session.service_type == "Oil Change"
        assert session.chosen_slot == "Thursday morning at 9 AM"
        assert result["result"]["success"] is True

    async def test_book_service_appointment_stores_phone_number(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "function-call",
            functionCall={
                "name": "book_service_appointment",
                "parameters": {
                    "customer_name": "Sarah Mitchell",
                    "phone_number": "+14045550293",
                    "service_type": "Brake Inspection",
                    "preferred_time": "Friday at 10 AM",
                }
            },
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.caller_number == "+14045550293"

    async def test_lookup_vehicle_unknown_tool_returns_error(self):
        """lookup_vehicle no longer exists — should return an error result gracefully."""
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "function-call",
            functionCall={"name": "lookup_vehicle", "parameters": {"vin_last4": "4872"}},
        )
        result = await handle_vapi_event(msg)
        assert "error" in result["result"]



# ── call-end ──────────────────────────────────────────────────────────────────

class TestCallEnded:
    async def test_sets_state_to_ended(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "call-end",
            call_kwargs={
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
            call_kwargs={
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
        """Simulate a complete call: start → transcript → book_service_appointment → call-end."""
        call_id = "lifecycle-test"

        def msg(event_type, **kwargs):
            return _make_message(event_type, call_id=call_id, **kwargs)

        # 1. Call starts
        await handle_vapi_event(msg("call-start"))
        s = await get_session(call_id)
        assert s.state == CallState.GREETING

        # 2. Customer speaks (greeting → identifying)
        await handle_vapi_event(msg("transcript", role="user",
            transcript="Hi I need an oil change", transcriptType="final"))
        s = await get_session(call_id)
        assert s.state == CallState.IDENTIFYING

        # 3. Sofia calls book_service_appointment after collecting info
        result = await handle_vapi_event(msg("function-call",
            functionCall={
                "name": "book_service_appointment",
                "parameters": {
                    "customer_name": "Sarah Mitchell",
                    "phone_number": "+14045550293",
                    "service_type": "Oil Change",
                    "preferred_time": "Monday at 10 AM",
                }
            }))
        s = await get_session(call_id)
        assert s.state == CallState.CLOSING
        assert s.appointment_id is not None
        assert result["result"]["success"] is True

        # 4. Call ends
        await handle_vapi_event(msg("call-end",
            call_kwargs={"id": call_id, "customer": {"number": "+14045550293"},
                  "endedReason": "customer-ended-call", "cost": 0.004, "duration": 156}))
        s = await get_session(call_id)
        assert s.state == CallState.ENDED
        assert s.cost_usd == pytest.approx(0.004)
        assert s.customer_name == "Sarah Mitchell"
        assert s.service_type == "Oil Change"


# ── modern tool-calls format ─────────────────────────────────────────────────

class TestModernToolCalls:
    async def test_tool_calls_returns_results_array(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "tool-calls",
            toolCallList=[{
                "id": "tc-001",
                "type": "function",
                "function": {
                    "name": "book_service_appointment",
                    "arguments": {
                        "customer_name": "Alex Johnson",
                        "phone_number": "+14045559999",
                        "service_type": "Tire Rotation",
                        "preferred_time": "Wednesday afternoon",
                    },
                },
            }],
        )
        result = await handle_vapi_event(msg)
        assert "results" in result
        assert len(result["results"]) == 1
        assert result["results"][0]["toolCallId"] == "tc-001"

    async def test_tool_calls_with_json_string_arguments(self):
        """Vapi sometimes sends arguments as a JSON string, not a dict."""
        import json
        await handle_vapi_event(_make_message("call-start"))
        args_str = json.dumps({
            "customer_name": "Bob Smith",
            "phone_number": "+14045550001",
            "service_type": "Brakes",
            "preferred_time": "Friday at noon",
        })
        msg = _make_message(
            "tool-calls",
            toolCallList=[{
                "id": "tc-002",
                "type": "function",
                "function": {
                    "name": "book_service_appointment",
                    "arguments": args_str,
                },
            }],
        )
        result = await handle_vapi_event(msg)
        assert "results" in result
        session = await get_session("test-call")
        assert session.customer_name == "Bob Smith"

    async def test_tool_calls_with_empty_list_returns_empty(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message("tool-calls", toolCallList=[])
        result = await handle_vapi_event(msg)
        assert result == {}

    async def test_tool_calls_unknown_tool_returns_error(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "tool-calls",
            toolCallList=[{
                "id": "tc-003",
                "type": "function",
                "function": {"name": "nonexistent_tool", "arguments": {}},
            }],
        )
        result = await handle_vapi_event(msg)
        assert "results" in result
        assert "Unknown tool" in result["results"][0]["result"]


# ── call-end transcript extraction ───────────────────────────────────────────

class TestCallEndTranscriptExtraction:
    async def test_extracts_transcript_from_call_messages(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "call-end",
            call_kwargs={
                "id": "test-call",
                "customer": {"number": "+14045551234"},
                "endedReason": "customer-ended-call",
                "cost": 0.003,
                "duration": 60.0,
                "messages": [
                    {"role": "assistant", "message": "Hi, how can I help?"},
                    {"role": "user", "message": "I need an oil change."},
                    {"role": "assistant", "message": "Sure thing!"},
                ],
            },
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert len(session.transcript) == 3
        assert session.transcript[0]["role"] == "assistant"
        assert session.transcript[1]["role"] == "user"

    async def test_does_not_overwrite_existing_transcript(self):
        """If transcripts were already collected during the call, don't overwrite."""
        await handle_vapi_event(_make_message("call-start"))
        # Simulate a mid-call transcript
        await handle_vapi_event(_make_message(
            "transcript", role="user",
            transcript="I need service.", transcriptType="final"
        ))
        session = await get_session("test-call")
        assert len(session.transcript) == 1

        # Now end with messages — should NOT overwrite
        msg = _make_message(
            "call-end",
            call_kwargs={
                "id": "test-call",
                "customer": {"number": "+14045551234"},
                "endedReason": "customer-ended-call",
                "cost": None,
                "duration": 30.0,
                "messages": [
                    {"role": "assistant", "message": "Hi!"},
                    {"role": "user", "message": "I need service."},
                ],
            },
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        # Original transcript preserved
        assert len(session.transcript) == 1

    async def test_handles_missing_cost_gracefully(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "call-end",
            call_kwargs={
                "id": "test-call",
                "customer": {"number": "+14045551234"},
                "endedReason": "assistant-ended-call",
                "cost": None,
                "duration": 45.0,
            },
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.cost_usd is None
        assert session.duration_seconds == pytest.approx(45.0)

    async def test_extracts_cost_from_breakdown(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message(
            "call-end",
            call_kwargs={
                "id": "test-call",
                "customer": {"number": "+14045551234"},
                "endedReason": "customer-ended-call",
                "cost": None,
                "duration": 90.0,
                "costBreakdown": {"total": 0.0125},
            },
        )
        await handle_vapi_event(msg)
        session = await get_session("test-call")
        assert session.cost_usd == pytest.approx(0.0125)


# ── status-update ────────────────────────────────────────────────────────────

class TestStatusUpdate:
    async def test_returns_empty_dict(self):
        await handle_vapi_event(_make_message("call-start"))
        msg = _make_message("status-update", status="in-progress")
        result = await handle_vapi_event(msg)
        assert result == {}
