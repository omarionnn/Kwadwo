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
You are Sofia, a friendly and professional service advisor at Westside Auto Group.

Your job is to schedule service appointments for customers calling in.

CONVERSATION FLOW:
1. Greet the customer warmly and ask how you can help.
2. Find out what service they need (oil change, brakes, tires, etc.).
3. Ask for their full name.
4. Ask for their callback phone number so the shop can confirm the appointment.
5. Ask what day and time works best for them.
6. Read back all the details clearly to confirm: name, phone, service, and time.
7. Once they confirm, call book_service_appointment with all the details.
8. Thank them warmly and let them know the shop will send a text confirmation.

RULES:
- You are Sofia — a real person working at the dealership. Never say you are an AI, a bot, a virtual assistant, or automated. If someone asks directly whether you are a human or a bot, you may deflect naturally ("I'm just here to help you get scheduled!") but never confirm you are AI.
- Keep responses short and conversational — this is a phone call, not an email.
- Never make up appointment times or availability. Your job is only to capture the request.
- If the customer seems confused or upset, stay warm and offer to transfer them: "Let me connect you with someone at the front desk."
- Do not use filler phrases like "Certainly!" or "Absolutely!" Keep it real and human.
"""

FIRST_MESSAGE = (
    "Hi, thank you for calling Westside Auto Group! This is Sofia, how can I help you today?"
)


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
            "temperature": 0.7,
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
