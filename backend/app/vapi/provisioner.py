"""
Vapi Provisioner — creates and configures a Vapi assistant for the demo.

Calls Vapi's REST API to:
  1. Create an assistant with voice, model, system prompt, and tool definitions
  2. Assign that assistant to a phone number

Docs: https://docs.vapi.ai/api-reference
"""

from __future__ import annotations
import httpx
import logging

logger = logging.getLogger("saafi.vapi.provisioner")

VAPI_BASE = "https://api.vapi.ai"

# ---------------------------------------------------------------------------
# Tool definitions (sent to Vapi so it knows when to fire function-calls)
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "lookup_vehicle",
            "description": "Look up a customer vehicle in the DMS by the last 4 digits of the VIN.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vin_last4": {
                        "type": "string",
                        "description": "Last 4 digits of the vehicle VIN.",
                    }
                },
                "required": ["vin_last4"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_availability",
            "description": "Get available service appointment slots for the next 7 days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vehicle_id": {
                        "type": "string",
                        "description": "DMS vehicle record ID returned by lookup_vehicle.",
                    },
                    "service_type": {
                        "type": "string",
                        "description": "Type of service: oil_change, brake_inspection, general, etc.",
                        "default": "general",
                    },
                },
                "required": ["vehicle_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book a confirmed service appointment in the DMS.",
            "parameters": {
                "type": "object",
                "properties": {
                    "vehicle_id": {
                        "type": "string",
                        "description": "DMS vehicle record ID.",
                    },
                    "slot_id": {
                        "type": "string",
                        "description": "Slot ID from get_availability.",
                    },
                    "customer_name": {
                        "type": "string",
                        "description": "Customer's full name.",
                    },
                    "service_type": {
                        "type": "string",
                        "description": "Type of service being booked.",
                        "default": "general",
                    },
                },
                "required": ["vehicle_id", "slot_id", "customer_name"],
            },
        },
    },
]

SYSTEM_PROMPT = """You are Saafi, a professional AI service scheduling agent for Westside Auto Group.

Your job is to:
1. Warmly greet the customer
2. Identify what service they need
3. Ask for and confirm their name and the last 4 digits of their VIN
4. Call lookup_vehicle to find their vehicle
5. Call get_availability to find open slots
6. Offer the customer 2-3 time slots to choose from
7. Confirm their chosen slot and call book_appointment to book it
8. End the call warmly, telling them they'll get an SMS confirmation

Rules:
- Always confirm the VIN last 4 digits before looking up the vehicle
- If lookup_vehicle returns found: false, apologize and ask them to call the front desk
- Never make up availability — always call get_availability first
- Keep responses concise and natural — this is a phone call
- Do not read out the slot_id to the customer, only the human-readable date/time"""

FIRST_MESSAGE = (
    "Hi! Thanks for calling Westside Auto Group. I'm Saafi, your AI service assistant. "
    "How can I help you today?"
)


async def create_assistant(api_key: str, webhook_url: str) -> dict:
    """
    Create a Vapi assistant via the REST API.
    Returns the created assistant dict (includes `id`).
    """
    payload = {
        "name": "Saafi — Westside Auto",
        "voice": {
            "provider": "11labs",
            "voiceId": "rachel",
        },
        "model": {
            "provider": "openai",
            "model": "gpt-4o-realtime-preview",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT}
            ],
            "tools": TOOLS,
        },
        "firstMessage": FIRST_MESSAGE,
        "serverUrl": f"{webhook_url}/vapi/webhook",
        "serverUrlSecret": None,
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2",
            "language": "en-US",
        },
        "endCallFunctionEnabled": True,
        "recordingEnabled": True,
        "hipaaEnabled": False,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{VAPI_BASE}/assistant",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Created Vapi assistant: {data['id']}")
        return data


async def assign_phone_number(api_key: str, phone_number_id: str, assistant_id: str) -> dict:
    """
    Link a Vapi phone number to the assistant.
    """
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.patch(
            f"{VAPI_BASE}/phone-number/{phone_number_id}",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"assistantId": assistant_id},
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Assigned assistant {assistant_id} to phone number {phone_number_id}")
        return data


async def get_phone_number_info(api_key: str, phone_number_id: str) -> dict:
    """Fetch the human-readable phone number for display in the dashboard."""
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{VAPI_BASE}/phone-number/{phone_number_id}",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()
