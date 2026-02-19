"""
Vapi Orchestrator — event-driven state machine.

Receives parsed Vapi webhook messages and transitions CallSession state
based on the event type. All side-effects (DMS calls, SMS) happen here.
"""

from __future__ import annotations
import logging
from datetime import datetime, timezone
from typing import Any

from app.models.call_models import (
    CallSession,
    CallState,
    VapiMessage,
    VapiEventType,
    ToolResult,
)
from app.orchestrator.session_store import (
    get_or_create_session,
    save_session,
    delete_session,
    get_session,
)
from app.dms.mock_dms import dispatch_tool

logger = logging.getLogger("saafi.orchestrator")


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------

async def handle_vapi_event(message: VapiMessage) -> dict[str, Any]:
    """
    Route a Vapi server message to the appropriate handler.
    Returns a dict response (may be empty or a tool result).
    """
    call_id = message.call.id
    caller_number = message.call.customer.number if message.call.customer else None

    session = await get_or_create_session(call_id, caller_number)

    match message.type:
        case VapiEventType.CALL_STARTED:
            return await _on_call_started(session)
        case VapiEventType.TRANSCRIPT:
            return await _on_transcript(session, message)
        case VapiEventType.FUNCTION_CALL:
            return await _on_function_call(session, message)
        case VapiEventType.STATUS_UPDATE:
            return await _on_status_update(session, message)
        case VapiEventType.CALL_ENDED:
            return await _on_call_ended(session, message)
        case _:
            logger.debug(f"Unhandled Vapi event type: {message.type}")
            return {}


# ---------------------------------------------------------------------------
# Individual event handlers
# ---------------------------------------------------------------------------

async def _on_call_started(session: CallSession) -> dict:
    logger.info(f"[{session.call_id}] Call started — state: {session.state}")
    session.state = CallState.GREETING
    await save_session(session)
    return {}  # Vapi handles the greeting via the assistant's firstMessage


async def _on_transcript(session: CallSession, message: VapiMessage) -> dict:
    """Append final transcript lines and infer state transitions from content."""
    # Only process final transcripts (not partial)
    if message.transcriptType == "partial":
        return {}

    if message.role and message.transcript:
        session.transcript.append({
            "role": message.role.value,
            "text": message.transcript,
        })

    # --- Naive state inference from transcript content (demo-grade) ---
    # In production: use intent classification or structured extraction.
    text_lower = (message.transcript or "").lower()

    if session.state == CallState.GREETING and message.role and message.role.value == "user":
        session.state = CallState.IDENTIFYING
        logger.info(f"[{session.call_id}] → IDENTIFYING")

    elif session.state == CallState.IDENTIFYING:
        # Try to extract VIN last 4 from user speech (simple pattern)
        import re
        vin_match = re.search(r"\b(\d{4})\b", text_lower)
        if vin_match:
            session.vin_last4 = vin_match.group(1)
            session.state = CallState.LOOKING_UP
            logger.info(f"[{session.call_id}] → LOOKING_UP (VIN: {session.vin_last4})")

    await save_session(session)
    return {}


async def _on_function_call(session: CallSession, message: VapiMessage) -> dict:
    """
    Handle a Vapi function-call event.

    Vapi pauses the assistant and waits for us to return a result.
    We dispatch to the DMS mock and update session state accordingly.
    """
    if not message.functionCall:
        return ToolResult(result={"error": "Missing functionCall payload"}).model_dump()

    fn_name: str = message.functionCall.get("name", "")
    parameters: dict = message.functionCall.get("parameters", {})

    logger.info(f"[{session.call_id}] Tool call: {fn_name}({parameters})")

    result = await dispatch_tool(fn_name, parameters)

    # --- Post-tool state transitions ---
    if fn_name == "lookup_vehicle" and result.get("found"):
        vehicle = result["vehicle"]
        session.vehicle_id = vehicle["id"]
        session.customer_name = vehicle.get("owner_name")
        session.state = CallState.OFFERING_SLOTS
        logger.info(f"[{session.call_id}] → OFFERING_SLOTS (vehicle: {vehicle['id']})")

    elif fn_name == "get_availability":
        slots = result.get("available_slots", [])
        session.offered_slots = [s["display"] for s in slots[:3]]
        session.state = CallState.CONFIRMING
        logger.info(f"[{session.call_id}] → CONFIRMING ({len(slots)} slots offered)")

    elif fn_name == "book_appointment" and result.get("success"):
        session.appointment_id = result.get("appointment_id")
        session.state = CallState.CLOSING
        logger.info(f"[{session.call_id}] → CLOSING (apt: {session.appointment_id})")

    await save_session(session)
    return ToolResult(result=result).model_dump()


async def _on_status_update(session: CallSession, message: VapiMessage) -> dict:
    logger.debug(f"[{session.call_id}] Status update: {message.status}")
    return {}


async def _on_call_ended(session: CallSession, message: VapiMessage) -> dict:
    logger.info(f"[{session.call_id}] Call ended — reason: {message.call.endedReason}")
    session.state = CallState.ENDED
    session.ended_at = datetime.now(timezone.utc).isoformat()
    session.ended_reason = message.call.endedReason
    session.cost_usd = message.call.cost
    session.duration_seconds = message.call.duration

    # Persist final session (keep for analytics; a background job would archive to DB)
    await save_session(session)
    return {}
