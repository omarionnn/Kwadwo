"""
Unit tests for DMS mock layer.

Tests all four tool functions (lookup_vehicle, get_availability,
book_appointment, send_sms) and the dispatch_tool router.
"""

import pytest
from app.dms.mock_dms import (
    lookup_vehicle,
    get_availability,
    book_appointment,
    send_sms,
    dispatch_tool,
    _APPOINTMENTS,
)


# ── lookup_vehicle ────────────────────────────────────────────────────────────

class TestLookupVehicle:
    async def test_known_vin_returns_vehicle(self):
        result = await lookup_vehicle("4872")
        assert result["found"] is True
        vehicle = result["vehicle"]
        assert vehicle["make"] == "Ford"
        assert vehicle["model"] == "F-150"
        assert vehicle["year"] == 2021
        assert vehicle["id"] == "v-4872"

    async def test_all_seeded_vins_returnable(self):
        for vin_last4 in ("4872", "3391", "7741"):
            result = await lookup_vehicle(vin_last4)
            assert result["found"] is True, f"VIN {vin_last4} should be found"

    async def test_unknown_vin_returns_not_found(self):
        result = await lookup_vehicle("0000")
        assert result["found"] is False
        assert "error" in result
        assert "0000" in result["error"]

    async def test_empty_vin_returns_not_found(self):
        result = await lookup_vehicle("")
        assert result["found"] is False

    async def test_vehicle_has_required_fields(self):
        result = await lookup_vehicle("7741")
        v = result["vehicle"]
        for field in ("id", "vin", "make", "model", "year", "owner_name", "mileage"):
            assert field in v, f"Missing field: {field}"


# ── get_availability ──────────────────────────────────────────────────────────

class TestGetAvailability:
    async def test_returns_slots_list(self):
        result = await get_availability("v-4872")
        assert "available_slots" in result
        assert isinstance(result["available_slots"], list)

    async def test_max_six_slots(self):
        result = await get_availability("v-4872", days_ahead=14)
        assert len(result["available_slots"]) <= 6

    async def test_slot_has_required_fields(self):
        result = await get_availability("v-4872")
        slots = result["available_slots"]
        assert len(slots) > 0
        slot = slots[0]
        for field in ("slot_id", "datetime", "display", "duration_minutes", "service_type"):
            assert field in slot, f"Slot missing field: {field}"

    async def test_slot_id_format(self):
        result = await get_availability("v-3391")
        for slot in result["available_slots"]:
            assert slot["slot_id"].startswith("slot-")

    async def test_custom_service_type_propagates(self):
        result = await get_availability("v-4872", service_type="oil_change")
        for slot in result["available_slots"]:
            assert slot["service_type"] == "oil_change"

    async def test_no_weekend_slots(self):
        from datetime import datetime
        result = await get_availability("v-7741", days_ahead=14)
        for slot in result["available_slots"]:
            dt = datetime.fromisoformat(slot["datetime"])
            assert dt.weekday() < 5, f"Slot on weekend: {slot['display']}"

    async def test_one_day_ahead_may_return_empty(self):
        result = await get_availability("v-4872", days_ahead=1)
        assert "available_slots" in result  # just exists, may be empty


# ── book_appointment ──────────────────────────────────────────────────────────

class TestBookAppointment:
    async def test_successful_booking(self):
        result = await book_appointment(
            vehicle_id="v-4872",
            slot_id="slot-202602200800",
            customer_name="Marcus Thompson",
            service_type="oil_change",
        )
        assert result["success"] is True
        assert "appointment_id" in result
        assert result["appointment_id"].startswith("apt-")

    async def test_appointment_persisted_in_store(self):
        _APPOINTMENTS.clear()
        result = await book_appointment(
            vehicle_id="v-3391",
            slot_id="slot-202602211000",
            customer_name="Sarah Mitchell",
        )
        apt_id = result["appointment_id"]
        assert apt_id in _APPOINTMENTS
        stored = _APPOINTMENTS[apt_id]
        assert stored["customer_name"] == "Sarah Mitchell"
        assert stored["vehicle_id"] == "v-3391"
        assert stored["status"] == "confirmed"

    async def test_missing_vehicle_id_returns_error(self):
        result = await book_appointment(
            vehicle_id="",
            slot_id="slot-abc",
            customer_name="Test User",
        )
        assert result["success"] is False
        assert "error" in result

    async def test_missing_slot_id_returns_error(self):
        result = await book_appointment(
            vehicle_id="v-4872",
            slot_id="",
            customer_name="Test User",
        )
        assert result["success"] is False

    async def test_confirmation_message_contains_appointment_id(self):
        result = await book_appointment("v-7741", "slot-xyz", "David Kim")
        assert result["appointment_id"] in result["message"]

    async def test_multiple_bookings_get_unique_ids(self):
        ids = set()
        for i in range(5):
            r = await book_appointment(f"v-4872", f"slot-{i:04d}", "Test User")
            ids.add(r["appointment_id"])
        assert len(ids) == 5  # all unique


# ── send_sms ──────────────────────────────────────────────────────────────────

class TestSendSms:
    async def test_returns_success(self):
        result = await send_sms("+14045551234", "Your appointment is confirmed.")
        assert result["success"] is True

    async def test_returns_phone_and_body(self):
        result = await send_sms("+14045550293", "Test message")
        assert result["to"] == "+14045550293"
        assert result["body"] == "Test message"


# ── dispatch_tool ─────────────────────────────────────────────────────────────

class TestDispatchTool:
    async def test_routes_lookup_vehicle(self):
        result = await dispatch_tool("lookup_vehicle", {"vin_last4": "4872"})
        assert result["found"] is True

    async def test_routes_get_availability(self):
        result = await dispatch_tool("get_availability", {"vehicle_id": "v-4872"})
        assert "available_slots" in result

    async def test_routes_book_appointment(self):
        result = await dispatch_tool("book_appointment", {
            "vehicle_id": "v-4872",
            "slot_id": "slot-dispatch-test",
            "customer_name": "Dispatch Test",
        })
        assert result["success"] is True

    async def test_unknown_tool_returns_error(self):
        result = await dispatch_tool("nonexistent_tool", {})
        assert "error" in result
        assert "Unknown tool" in result["error"]

    async def test_bad_parameters_returns_error(self):
        result = await dispatch_tool("lookup_vehicle", {"wrong_param": "x"})
        assert "error" in result
