"""
Session Store — CallSession state backed by Upstash Redis.

Uses the Upstash REST-based Redis client (upstash-redis), which works
in any environment including Render without needing a TCP Redis connection.

Keys are prefixed with "session:" so the store is easy to inspect/clear.
Falls back gracefully to in-memory-only mode if Redis env vars are missing.
"""

from __future__ import annotations
import logging
import os
from typing import Optional

from app.models.call_models import CallSession, CallState

logger = logging.getLogger("saafi.session_store")

# ── Redis client (lazy-initialised) ──────────────────────────────────────────

_redis = None


def _get_redis():
    global _redis
    if _redis is not None:
        return _redis

    url   = os.getenv("UPSTASH_REDIS_REST_URL")
    token = os.getenv("UPSTASH_REDIS_REST_TOKEN")

    if not url or not token:
        logger.warning("UPSTASH_REDIS_REST_URL / TOKEN not set — sessions will be in-memory only.")
        return None

    try:
        from upstash_redis.asyncio import Redis
        _redis = Redis(url=url, token=token)
        logger.info("Upstash Redis client initialised.")
    except Exception as e:
        logger.error(f"Failed to initialise Upstash Redis: {e}")
        return None

    return _redis


# In-memory fallback {call_id: json_str} (also used by tests to inspect/clear state)
_STORE: dict[str, str] = {}

_PREFIX = "session:"


# ── Public API ────────────────────────────────────────────────────────────────

async def get_session(call_id: str) -> Optional[CallSession]:
    key = f"{_PREFIX}{call_id}"
    redis = _get_redis()

    if redis:
        try:
            raw = await redis.get(key)
            if raw is None:
                return None
            return CallSession.model_validate_json(raw if isinstance(raw, str) else raw.decode())
        except Exception as e:
            logger.error(f"Redis get error: {e}")

    # Fallback to memory
    raw = _STORE.get(call_id)
    return CallSession.model_validate_json(raw) if raw else None


async def save_session(session: CallSession) -> None:
    key = f"{_PREFIX}{session.call_id}"
    data = session.model_dump_json()
    redis = _get_redis()

    if redis:
        try:
            await redis.set(key, data)
            return
        except Exception as e:
            logger.error(f"Redis set error: {e}")

    # Fallback to memory
    _STORE[session.call_id] = data


async def delete_session(call_id: str) -> None:
    key = f"{_PREFIX}{call_id}"
    redis = _get_redis()

    if redis:
        try:
            await redis.delete(key)
            return
        except Exception as e:
            logger.error(f"Redis delete error: {e}")

    _STORE.pop(call_id, None)


async def get_all_sessions() -> list[CallSession]:
    redis = _get_redis()

    if redis:
        try:
            keys = await redis.keys(f"{_PREFIX}*")
            if not keys:
                return []
            # Fetch all values in one round-trip
            values = await redis.mget(*keys)
            sessions = []
            for raw in values:
                if raw is None:
                    continue
                try:
                    s = CallSession.model_validate_json(raw if isinstance(raw, str) else raw.decode())
                    sessions.append(s)
                except Exception:
                    pass
            return sessions
        except Exception as e:
            logger.error(f"Redis get_all error: {e}")

    # Fallback to memory
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
