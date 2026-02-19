"""
DMS Mock — simulates a dealership management system (CDK/Fortellis-style API).

In production this would be replaced by real DMS connector calls.
All functions are async to match the production interface signature.
"""

from __future__ import annotations
import random
import string
from datetime import datetime, timedelta
from typing import Optional


# ---------------------------------------------------------------------------
# In-memory vehicle "database"
# ---------------------------------------------------------------------------

_VEHICLES: dict[str, dict] = {
    "4872": {
        "id": "v-4872",
        "vin": "1FTFW1ET4MFA04872",
        "make": "Ford",
        "model": "F-150",
        "year": 2021,
        "color": "Oxford White",
        "owner_name": "Marcus Thompson",
        "owner_phone": "+14045550147",
        "mileage": 34200,
        "last_service": "2025-09-12",
    },
    "3391": {
        "id": "v-3391",
        "vin": "1HGBH41JXMN013391",
        "make": "Honda",
        "model": "Accord",
        "year": 2019,
        "color": "Lunar Silver",
        "owner_name": "Sarah Mitchell",
        "owner_phone": "+14045550293",
        "mileage": 51800,
        "last_service": "2025-11-03",
    },
    "7741": {
        "id": "v-7741",
        "vin": "WBA8E9G56HNU67741",
        "make": "BMW",
        "model": "3 Series",
        "year": 2022,
        "color": "Alpine White",
        "owner_name": "David Kim",
        "owner_phone": "+14045550874",
        "mileage": 18500,
        "last_service": "2025-12-20",
    },
}

# In-memory appointments store (production: PostgreSQL)
_APPOINTMENTS: dict[str, dict] = {}


def _random_id(prefix: str = "apt") -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{prefix}-{suffix}"


# ---------------------------------------------------------------------------
# DMS tool implementations (called by the state machine)
# ---------------------------------------------------------------------------

async def lookup_vehicle(vin_last4: str, phone: Optional[str] = None) -> dict:
    """
    Look up a vehicle by last 4 digits of VIN.
    Returns vehicle record or an error payload.
    """
    record = _VEHICLES.get(vin_last4)
    if not record:
        return {"found": False, "error": f"No vehicle found with VIN ending in {vin_last4}."}
    return {"found": True, "vehicle": record}


async def get_availability(
    vehicle_id: str,
    service_type: str = "general",
    days_ahead: int = 7,
) -> dict:
    """
    Return available service slots for the next `days_ahead` days.
    In production: queries DMS calendar API.
    """
    base = datetime.now()
    slots: list[dict] = []

    for offset in range(1, days_ahead + 1):
        day = base + timedelta(days=offset)
        # Simulate 2-3 open slots per day, skip weekends
        if day.weekday() >= 5:
            continue
        for hour in random.sample([8, 10, 14, 16], k=random.randint(2, 3)):
            slot_dt = day.replace(hour=hour, minute=0, second=0, microsecond=0)
            slots.append({
                "slot_id": f"slot-{slot_dt.strftime('%Y%m%d%H%M')}",
                "datetime": slot_dt.isoformat(),
                "display": slot_dt.strftime("%A, %B %-d at %-I:%M %p"),
                "duration_minutes": 60,
                "service_type": service_type,
            })
        if len(slots) >= 6:
            break

    return {"available_slots": slots[:6]}


async def book_appointment(
    vehicle_id: str,
    slot_id: str,
    customer_name: str,
    service_type: str = "general",
) -> dict:
    """
    Book an appointment in the DMS.
    Returns confirmation with appointment ID.
    """
    if not vehicle_id or not slot_id:
        return {"success": False, "error": "vehicle_id and slot_id are required."}

    apt_id = _random_id("apt")
    _APPOINTMENTS[apt_id] = {
        "id": apt_id,
        "vehicle_id": vehicle_id,
        "slot_id": slot_id,
        "customer_name": customer_name,
        "service_type": service_type,
        "status": "confirmed",
        "created_at": datetime.now().isoformat(),
    }
    return {
        "success": True,
        "appointment_id": apt_id,
        "message": f"Appointment confirmed! Your ID is {apt_id}. You'll receive an SMS confirmation shortly.",
    }


async def send_sms(phone: str, message: str) -> dict:
    """
    Mock SMS send. Production: Twilio / Vapi SMS tool.
    """
    print(f"[SMS -> {phone}]: {message}")
    return {"success": True, "to": phone, "body": message}


# ---------------------------------------------------------------------------
# Tool router — called by the orchestrator when Vapi fires a function-call
# ---------------------------------------------------------------------------

TOOL_MAP = {
    "lookup_vehicle": lookup_vehicle,
    "get_availability": get_availability,
    "book_appointment": book_appointment,
    "send_sms": send_sms,
}


async def dispatch_tool(name: str, parameters: dict) -> dict:
    """Route a Vapi function-call to the correct DMS mock function."""
    handler = TOOL_MAP.get(name)
    if not handler:
        return {"error": f"Unknown tool: {name}"}
    try:
        return await handler(**parameters)
    except TypeError as e:
        return {"error": f"Bad parameters for {name}: {e}"}
