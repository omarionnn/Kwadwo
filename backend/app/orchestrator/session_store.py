"""
Session Store — CallSession state backed by a JSON file on disk.

Writes are synchronous-to-disk (via a thread executor) to survive backend
restarts without adding Redis as a dependency.

The in-memory dict is used as a fast read cache so hot paths don't hit disk.
"""

from __future__ import annotations
import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Optional

from app.models.call_models import CallSession, CallState

logger = logging.getLogger("saafi.session_store")

def get_data_dir() -> Path:
    """Returns the directory where session data is stored."""
    default_dir = Path(__file__).parents[3] / "data"
    return Path(os.getenv("SAAFI_DATA_DIR", str(default_dir)))


def get_sessions_file() -> Path:
    """Returns the path to the sessions.json file."""
    return get_data_dir() / "sessions.json"


# In-memory cache {call_id: CallSession}
_STORE: dict[str, str] = {}


def _ensure_data_dir() -> None:
    get_data_dir().mkdir(parents=True, exist_ok=True)


def _load_from_disk() -> None:
    """Load all sessions from disk into the in-memory cache on startup."""
    _ensure_data_dir()
    sessions_file = get_sessions_file()
    if not sessions_file.exists():
        return
    try:
        with open(sessions_file, "r") as f:
            data: dict = json.load(f)
        for call_id, raw in data.items():
            _STORE[call_id] = raw if isinstance(raw, str) else json.dumps(raw)
        logger.info(f"Loaded {len(_STORE)} sessions from disk ({sessions_file})")
    except Exception as e:
        logger.warning(f"Could not load sessions from disk: {e}")


def _flush_to_disk() -> None:
    """Write the current in-memory store to disk (called from a thread executor)."""
    _ensure_data_dir()
    sessions_file = get_sessions_file()
    try:
        with open(sessions_file, "w") as f:
            json.dump(_STORE, f)
    except Exception as e:
        logger.error(f"Failed to flush sessions to disk: {e}")


async def _persist() -> None:
    """Async wrapper — runs the sync file-write in a thread so we don't block the event loop."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _flush_to_disk)


# ── Public API ────────────────────────────────────────────────────────────────

async def get_session(call_id: str) -> Optional[CallSession]:
    raw = _STORE.get(call_id)
    if raw is None:
        return None
    return CallSession.model_validate_json(raw)


async def save_session(session: CallSession) -> None:
    _STORE[session.call_id] = session.model_dump_json()
    await _persist()


async def delete_session(call_id: str) -> None:
    _STORE.pop(call_id, None)
    await _persist()


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
