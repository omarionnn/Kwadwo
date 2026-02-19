"""
Session Store — manages CallSession state in an in-memory dict.

In production this is Redis (via `redis.asyncio`). The interface is identical
so swapping is a single-line change in the factory.
"""

from __future__ import annotations
import json
from typing import Optional
from app.models.call_models import CallSession, CallState


# In-memory store {call_id: serialized_session_json}
_STORE: dict[str, str] = {}


async def get_session(call_id: str) -> Optional[CallSession]:
    raw = _STORE.get(call_id)
    if raw is None:
        return None
    return CallSession.model_validate_json(raw)


async def save_session(session: CallSession) -> None:
    _STORE[session.call_id] = session.model_dump_json()


async def delete_session(call_id: str) -> None:
    _STORE.pop(call_id, None)


async def get_all_sessions() -> list[CallSession]:
    return [CallSession.model_validate_json(v) for v in _STORE.values()]


async def get_or_create_session(call_id: str, caller_number: Optional[str] = None) -> CallSession:
    session = await get_session(call_id)
    if session is None:
        from datetime import datetime, timezone
        session = CallSession(
            call_id=call_id,
            caller_number=caller_number,
            state=CallState.INITIATED,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        await save_session(session)
    return session
