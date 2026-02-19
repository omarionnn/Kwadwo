"""
Vapi Orchestrator — Pydantic models for Vapi webhook payloads and internal state.
"""

from __future__ import annotations
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Vapi webhook event types (subset we care about for the call lifecycle)
# ---------------------------------------------------------------------------

class VapiEventType(str, Enum):
    CALL_STARTED = "call-start"
    CALL_ENDED = "call-end"
    TRANSCRIPT = "transcript"
    FUNCTION_CALL = "function-call"
    SPEECH_UPDATE = "speech-update"
    STATUS_UPDATE = "status-update"


class TranscriptRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


# ---------------------------------------------------------------------------
# Vapi webhook payload shapes
# ---------------------------------------------------------------------------

class VapiCaller(BaseModel):
    number: Optional[str] = None


class VapiCall(BaseModel):
    id: str
    orgId: Optional[str] = None
    assistantId: Optional[str] = None
    phoneNumberId: Optional[str] = None
    customer: Optional[VapiCaller] = None
    createdAt: Optional[str] = None
    startedAt: Optional[str] = None
    endedAt: Optional[str] = None
    endedReason: Optional[str] = None
    cost: Optional[float] = None
    duration: Optional[float] = None


class VapiTranscriptMessage(BaseModel):
    role: TranscriptRole
    message: str
    time: Optional[float] = None


class VapiFunctionCallParameters(BaseModel):
    model_config = {"extra": "allow"}


class VapiMessage(BaseModel):
    """Top-level Vapi server message."""
    type: VapiEventType
    call: VapiCall

    # Only present for transcript events
    role: Optional[TranscriptRole] = None
    transcript: Optional[str] = None
    transcriptType: Optional[str] = None  # "partial" | "final"

    # Only present for function-call events
    functionCall: Optional[dict[str, Any]] = None

    # Only present for status-update
    status: Optional[str] = None


# ---------------------------------------------------------------------------
# Internal call state machine
# ---------------------------------------------------------------------------

class CallState(str, Enum):
    """States a call can be in during its lifecycle."""
    INITIATED = "initiated"
    GREETING = "greeting"
    IDENTIFYING = "identifying"       # Collecting name / VIN
    LOOKING_UP = "looking_up"         # DMS vehicle lookup in progress
    OFFERING_SLOTS = "offering_slots" # Presenting schedule options
    CONFIRMING = "confirming"         # Confirming the chosen slot
    BOOKING = "booking"               # Writing appointment to DMS
    CLOSING = "closing"               # Farewell + SMS confirmation
    ENDED = "ended"
    FAILED = "failed"


class CallSession(BaseModel):
    """Runtime state for a single call — stored in Redis by call_id."""
    call_id: str
    state: CallState = CallState.INITIATED
    caller_number: Optional[str] = None
    customer_name: Optional[str] = None
    vin_last4: Optional[str] = None
    vehicle_id: Optional[str] = None          # DMS vehicle record ID
    offered_slots: list[str] = Field(default_factory=list)
    chosen_slot: Optional[str] = None
    appointment_id: Optional[str] = None
    transcript: list[dict[str, str]] = Field(default_factory=list)
    created_at: Optional[str] = None
    ended_at: Optional[str] = None
    ended_reason: Optional[str] = None
    cost_usd: Optional[float] = None
    duration_seconds: Optional[float] = None


# ---------------------------------------------------------------------------
# Function-call tool response shape (returned to Vapi)
# ---------------------------------------------------------------------------

class ToolResult(BaseModel):
    result: Any
