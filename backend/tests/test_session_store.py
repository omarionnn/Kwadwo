"""
Unit tests for the session store.
"""

import pytest
from app.orchestrator.session_store import (
    get_session,
    save_session,
    delete_session,
    get_all_sessions,
    get_or_create_session,
    _STORE,
)
from app.models.call_models import CallSession, CallState


@pytest.fixture(autouse=True)
def clear_store():
    """Wipe store before every test to ensure isolation."""
    _STORE.clear()
    from app.orchestrator.session_store import _SESSIONS_FILE
    if _SESSIONS_FILE.exists():
        _SESSIONS_FILE.unlink()
    yield
    _STORE.clear()
    if _SESSIONS_FILE.exists():
        _SESSIONS_FILE.unlink()


class TestSessionStore:
    async def test_get_nonexistent_returns_none(self):
        result = await get_session("does-not-exist")
        assert result is None

    async def test_save_and_retrieve(self):
        session = CallSession(call_id="call-001", state=CallState.GREETING)
        await save_session(session)
        retrieved = await get_session("call-001")
        assert retrieved is not None
        assert retrieved.call_id == "call-001"
        assert retrieved.state == CallState.GREETING

    async def test_save_overwrites_existing(self):
        session = CallSession(call_id="call-002", state=CallState.GREETING)
        await save_session(session)
        session.state = CallState.BOOKING
        await save_session(session)
        retrieved = await get_session("call-002")
        assert retrieved.state == CallState.BOOKING

    async def test_delete_removes_session(self):
        session = CallSession(call_id="call-003", state=CallState.ENDED)
        await save_session(session)
        await delete_session("call-003")
        assert await get_session("call-003") is None

    async def test_delete_nonexistent_does_not_raise(self):
        await delete_session("nonexistent-call")  # Should not raise

    async def test_get_all_sessions_empty(self):
        sessions = await get_all_sessions()
        assert sessions == []

    async def test_get_all_sessions_returns_all(self):
        for i in range(3):
            await save_session(CallSession(call_id=f"call-{i}", state=CallState.INITIATED))
        sessions = await get_all_sessions()
        assert len(sessions) == 3

    async def test_get_or_create_creates_new_session(self):
        session = await get_or_create_session("call-new", caller_number="+14045551234")
        assert session.call_id == "call-new"
        assert session.caller_number == "+14045551234"
        assert session.state == CallState.INITIATED

    async def test_get_or_create_returns_existing_session(self):
        existing = CallSession(call_id="call-existing", state=CallState.CONFIRMING)
        await save_session(existing)
        session = await get_or_create_session("call-existing")
        assert session.state == CallState.CONFIRMING  # unchanged

    async def test_session_fields_persist_correctly(self):
        session = CallSession(
            call_id="call-full",
            state=CallState.BOOKING,
            caller_number="+14045550000",
            customer_name="Jane Doe",
            vehicle_id="v-4872",
            appointment_id="apt-xyz123",
            cost_usd=0.0042,
            duration_seconds=145.5,
        )
        await save_session(session)
        retrieved = await get_session("call-full")
        assert retrieved.customer_name == "Jane Doe"
        assert retrieved.vehicle_id == "v-4872"
        assert retrieved.appointment_id == "apt-xyz123"
        assert retrieved.cost_usd == pytest.approx(0.0042)
        assert retrieved.duration_seconds == pytest.approx(145.5)
