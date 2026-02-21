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
# Tool definitions
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "book_service_appointment",
            "description": (
                "Call this once you have confirmed the customer's full name, callback phone number, "
                "the type of service they need, and their preferred date and time. "
                "This stores the appointment request in the system."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {
                        "type": "string",
                        "description": "Customer's full name.",
                    },
                    "phone_number": {
                        "type": "string",
                        "description": "Customer's callback phone number.",
                    },
                    "service_type": {
                        "type": "string",
                        "description": "The service the customer needs, e.g. oil change, brake inspection, tire rotation, general maintenance.",
                    },
                    "preferred_time": {
                        "type": "string",
                        "description": "Customer's preferred appointment date and time as a natural language string, e.g. 'Thursday morning' or 'Monday at 10am'.",
                    },
                },
                "required": ["customer_name", "phone_number", "service_type", "preferred_time"],
            },
        },
    },
]

# ---------------------------------------------------------------------------
# System prompt  — never discloses she is an AI
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
### ROLE
You are Sofia, a friendly and professional Service Advisor at Westside Auto Group. Your sole goal is to collect appointment details naturally and efficiently.

### CONVERSATION LOGIC
1. GREET: Start with the FIRST_MESSAGE.
2. EXTRACT: Listen for Service Type, Name, Phone, and Preferred Time. 
   - CRITICAL: If the user provides multiple pieces of info at once (e.g., "Hi, I'm Bob, I need an oil change Tuesday"), do NOT ask for them individually. Move to the missing info.
3. LOGISTICS:
   - SERVICE: If they ask for a price or a complex repair (engine/transmission), say: "I'll have our lead tech look at that and give you a quote when they confirm your slot."
   - TIME: If they ask if a time is "open," say: "I’ll put that down as your preferred time, and the shop will confirm if it's available in their text follow-up."
4. CONFIRM: Read back Name, Phone, Service, and Time. Ask: "Does that all look correct?"
5. EXECUTE: Call `book_service_appointment`.
6. CLOSE: Inform them a text confirmation is coming. Thank them and hang up.

### STYLE & RULES
- VOICE-FIRST: Keep responses under 15 words. Avoid long lists.
- FILLERS: Do not use "Certainly" or "Absolutely." Use "Got it," "Sure," or "Okay."
- ANTI-BOT: If asked if you are AI, say: "I'm the digital assistant here to help get you on the calendar quickly!" and immediately pivot back to the booking.
- ESCALATION: If the customer is angry or confused, say: "I want to make sure you're taken care of. Let me transfer you to our front desk manager."
"""

FIRST_MESSAGE = "Hi, thanks for calling Westside Auto Group! This is Sofia, how can I help you today?"


async def create_assistant(api_key: str, webhook_url: str) -> dict:
    """
    Create a Vapi assistant via the REST API.
    Returns the created assistant dict (includes `id`).
    """
    payload = {
        "name": "Sofia — Westside Auto",
        "voice": {
            "provider": "openai",
            "voiceId": "nova",          # OpenAI female voice
            "speed": 1.0,
        },
        "model": {
            "provider": "openai",
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT}
            ],
            "tools": TOOLS,
            "temperature": 0.5,
        },
        "firstMessage": FIRST_MESSAGE,
        "serverUrl": f"{webhook_url}/vapi/webhook",
        "serverMessages": [
            "assistant.started",
            "end-of-call-report",
            "transcript",
            "tool-calls",
            "status-update",
            "speech-update",
            "hang"
        ],
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2",
            "language": "en-US",
        },
        "endCallFunctionEnabled": True,
        "recordingEnabled": True,
        # Ask Vapi to send us the full conversation on call-end
        "artifactPlan": {
            "recordingEnabled": True,
            "videoRecordingEnabled": False,
        },
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{VAPI_BASE}/assistant",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        if resp.status_code >= 400:
            logger.error(f"Vapi Error {resp.status_code}: {resp.text}")
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
