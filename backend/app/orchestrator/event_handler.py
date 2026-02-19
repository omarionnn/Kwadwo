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
    if not session.created_at:
        session.created_at = datetime.now(timezone.utc).isoformat()
    await save_session(session)
    return {}  # Vapi handles the greeting via the assistant's firstMessage


async def _on_transcript(session: CallSession, message: VapiMessage) -> dict:
    """Append final transcript lines and infer state transitions from content."""
    # Only process final transcripts (not partial)
    if message.transcriptType == "partial":
        return {}

    role_str = message.role  # Now a plain str ("user" | "assistant")
    if role_str and message.transcript:
        session.transcript.append({
            "role": role_str,
            "text": message.transcript,
        })

    # --- Naive state inference from transcript content (demo-grade) ---
    text_lower = (message.transcript or "").lower()

    if session.state == CallState.GREETING and role_str == "user":
        session.state = CallState.IDENTIFYING
        logger.info(f"[{session.call_id}] → IDENTIFYING")

    elif session.state == CallState.IDENTIFYING and role_str == "user":
        import re
        # Match "4872", "4 8 7 2", "four eight seven two" (digit-only for now)
        vin_match = re.search(r"\b(\d[\s\-]?\d[\s\-]?\d[\s\-]?\d)\b", text_lower)
        if vin_match:
            session.vin_last4 = re.sub(r"\s+", "", vin_match.group(1))
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

    # Duration — Vapi sends this on the call object directly
    session.duration_seconds = message.call.duration

    # Cost — try call.cost first, then call.costBreakdown.total (different Vapi versions)
    raw_call = message.model_extra.get("call", {}) if hasattr(message, "model_extra") else {}
    if message.call.cost is not None:
        session.cost_usd = message.call.cost
    elif isinstance(raw_call, dict):
        breakdown = raw_call.get("costBreakdown", {})
        session.cost_usd = breakdown.get("total") if breakdown else None

    # ── Extract full transcript from call.messages ────────────────────────────
    # Vapi includes the complete conversation in call.messages on call-end.
    # This is more reliable than relying on interim transcript events.
    call_dict = message.call.model_dump(exclude_none=True)
    messages_raw = call_dict.get("messages", [])

    if messages_raw and not session.transcript:
        # Only replace if we have no transcript yet (don't overwrite partial transcripts)
        extracted = []
        for m in messages_raw:
            role = m.get("role", "")
            # Vapi roles: "user", "assistant", "tool" — skip tool/system
            if role in ("user", "assistant"):
                text = m.get("message") or m.get("content") or m.get("text") or ""
                if text.strip():
                    extracted.append({"role": role, "text": text.strip()})
        if extracted:
            session.transcript = extracted
            logger.info(f"[{session.call_id}] Extracted {len(extracted)} transcript lines from call.messages")

    await save_session(session)
    return {}
