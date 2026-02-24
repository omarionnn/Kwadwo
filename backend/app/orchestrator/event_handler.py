"""
Vapi Orchestrator — event-driven state machine.

Receives parsed Vapi webhook messages and transitions CallSession state
based on the event type. All side-effects happen here.
"""

from __future__ import annotations
import json
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
            # Legacy format: {functionCall: {name, parameters}}
            return await _on_function_call(session, message)
        case VapiEventType.TOOL_CALLS:
            # Modern format: {toolCallList: [{id, type, function: {name, arguments}}]}
            return await _on_tool_calls(session, message)
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
    return {}


async def _on_transcript(session: CallSession, message: VapiMessage) -> dict:
    """Append final transcript lines and infer state transitions from content."""
    # Vapi sends 'transcript' field, but might use 'message' or 'content' in some versions
    text = (
        message.transcript or
        (message.model_extra or {}).get("message") or
        (message.model_extra or {}).get("content") or
        ""
    )

    if message.role and text:
        # Avoid duplicates if we're getting both partial and final
        # For now, we only append if it's final or if transcriptType is missing
        if message.transcriptType == "partial":
            return {}

        session.transcript.append({
            "role": "assistant" if message.role in ("assistant", "bot") else "user",
            "text": text.strip(),
        })

    # State transitions based on who is speaking
    if session.state == CallState.GREETING and message.role == "user":
        session.state = CallState.IDENTIFYING
        logger.info(f"[{session.call_id}] → IDENTIFYING")

    await save_session(session)
    return {}


async def _on_function_call(session: CallSession, message: VapiMessage) -> dict:
    """
    Handle a legacy Vapi function-call event.
    Format: {type: "function-call", functionCall: {name, parameters}}
    """
    if not message.functionCall:
        return ToolResult(result={"error": "Missing functionCall payload"}).model_dump()

    fn_name: str = message.functionCall.get("name", "")
    parameters: dict = message.functionCall.get("parameters", {})

    logger.info(f"[{session.call_id}] [legacy] Tool call: {fn_name}({parameters})")

    if fn_name == "book_service_appointment":
        return await _handle_book_service_appointment(session, parameters)

    logger.warning(f"[{session.call_id}] Unknown tool: {fn_name}")
    return ToolResult(result={"error": f"Unknown tool: {fn_name}"}).model_dump()


async def _on_tool_calls(session: CallSession, message: VapiMessage) -> dict:
    """
    Handle a modern Vapi tool-calls event.
    Format: {type: "tool-calls", toolCallList: [{id, type, function: {name, arguments}}]}
    Vapi expects response: {results: [{toolCallId, result}]}
    """
    tool_list = message.toolCallList or []
    # Also check model_extra in case Pydantic didn't map it
    if not tool_list and hasattr(message, "model_extra"):
        tool_list = message.model_extra.get("toolCallList") or []

    logger.info(f"[{session.call_id}] [modern] tool-calls: {len(tool_list)} tools")

    if not tool_list:
        logger.warning(f"[{session.call_id}] tool-calls event with empty toolCallList")
        return {}

    results = []
    for tool_call in tool_list:
        tool_call_id = tool_call.get("id", "")
        fn   = tool_call.get("function", {})
        name = fn.get("name", "")
        # arguments can be a JSON string OR a dict
        raw_args = fn.get("arguments", {})
        if isinstance(raw_args, str):
            import json as _json
            try:
                params = _json.loads(raw_args)
            except Exception:
                params = {}
        else:
            params = raw_args

        logger.info(f"[{session.call_id}] Tool: {name}({params})")

        if name == "book_service_appointment":
            tool_result = await _handle_book_service_appointment(session, params)
            result_value = tool_result.get("result", {})
            # Vapi expects the result as a string in the modern format
            if isinstance(result_value, dict):
                result_str = result_value.get("message") or str(result_value)
            else:
                result_str = str(result_value)
        else:
            logger.warning(f"[{session.call_id}] Unknown tool: {name}")
            result_str = f"Unknown tool: {name}"

        results.append({
            "toolCallId": tool_call_id,
            "result": result_str,
        })

    return {"results": results}



async def _handle_book_service_appointment(session: CallSession, params: dict) -> dict:
    """Store the appointment request collected by Sofia during the call."""
    customer_name = params.get("customer_name", "").strip()
    phone_number  = params.get("phone_number", "").strip()
    service_type  = params.get("service_type", "").strip()
    preferred_time = params.get("preferred_time", "").strip()

    # Update session with collected info
    session.customer_name = customer_name
    session.caller_number = phone_number or session.caller_number
    session.service_type  = service_type
    session.chosen_slot   = preferred_time
    session.offered_slots = [service_type] if service_type else session.offered_slots

    # Generate a booking reference
    import random, string
    ref = "APT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    session.appointment_id = ref
    session.state = CallState.CLOSING

    logger.info(
        f"[{session.call_id}] Appointment captured: {customer_name} / {phone_number} / "
        f"{service_type} / {preferred_time} → {ref}"
    )

    await save_session(session)

    return ToolResult(result={
        "success": True,
        "appointment_ref": ref,
        "message": (
            f"Got it! I've scheduled {customer_name} for {service_type} on {preferred_time}. "
            f"Confirmation reference: {ref}. We'll send a text to {phone_number}."
        ),
    }).model_dump()


async def _on_status_update(session: CallSession, message: VapiMessage) -> dict:
    logger.debug(f"[{session.call_id}] Status update: {message.status}")
    return {}


async def _on_call_ended(session: CallSession, message: VapiMessage) -> dict:
    logger.info(f"[{session.call_id}] Call ended — reason: {message.call.endedReason}")

    session.state = CallState.ENDED
    session.ended_at = datetime.now(timezone.utc).isoformat()
    session.ended_reason = message.call.endedReason
    session.duration_seconds = message.call.duration

    # Cost — try call.cost first, then call.costBreakdown.total (Vapi versions vary)
    if message.call.cost is not None:
        session.cost_usd = message.call.cost
    else:
        call_extra = message.call.model_extra or {}
        breakdown = call_extra.get("costBreakdown", {})
        if breakdown:
            session.cost_usd = breakdown.get("total")

    # ── Extract analysisPlan Summary ─────────────────────────────────────────
    # Vapi sends analysis results (including summary) in the `analysis` object on call-end.
    # We check both the parsed Pydantic field and the raw extra dictionary.
    analysis = getattr(message.call, "analysis", None) or (message.call.model_extra or {}).get("analysis", {})
    if analysis and isinstance(analysis, dict):
        summary = analysis.get("summary")
        if summary:
            session.summary = summary
            logger.info(f"[{session.call_id}] Extracted Call Summary: {summary}")

    # ── Extract transcript from call.messages ────────────────────────────────
    # Vapi includes the full conversation in call.messages on call-end.
    # Log the raw extra so we can debug the exact field name.
    call_extra = message.call.model_extra or {}
    logger.info(f"[{session.call_id}] call_extra keys: {list(call_extra.keys())}")

    # Try several known locations Vapi uses across API versions
    messages_raw = (
        call_extra.get("messages")         # most common
        or call_extra.get("transcript")    # some versions send full transcript here
        or call_extra.get("artifact", {}).get("messages")
        or call_extra.get("analysis", {}).get("transcript")
        or []
    )

    # Also try via model_dump — includes extra fields
    if not messages_raw:
        call_dump = message.call.model_dump()
        messages_raw = (
            call_dump.get("messages")
            or call_dump.get("transcript")
            or (call_dump.get("artifact") or {}).get("messages")
            or (call_dump.get("analysis") or {}).get("transcript")
            or []
        )

    logger.info(f"[{session.call_id}] messages_raw count: {len(messages_raw) if isinstance(messages_raw, list) else 0}")

    if messages_raw and isinstance(messages_raw, list) and not session.transcript:
        extracted = []
        for m in messages_raw:
            if not isinstance(m, dict):
                continue
            role = m.get("role", "")
            if role in ("user", "assistant", "bot"):
                # Vapi uses 'message', 'content', or 'text' for the text
                text = (
                    m.get("message") or
                    m.get("content") or
                    m.get("text") or
                    ""
                )
                if isinstance(text, list):
                    # GPT-4o sometimes returns content as a list of {type, text} dicts
                    text = " ".join(
                        t.get("text", "") for t in text if isinstance(t, dict)
                    )
                if text.strip():
                    extracted.append({
                        "role": "assistant" if role in ("assistant", "bot") else "user",
                        "text": text.strip(),
                    })

        if extracted:
            session.transcript = extracted
            logger.info(f"[{session.call_id}] Extracted {len(extracted)} transcript lines")
        else:
            logger.warning(f"[{session.call_id}] messages_raw present but no lines extracted")

    await save_session(session)
    return {}
