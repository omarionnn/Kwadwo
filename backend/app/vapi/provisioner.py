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
You are Sofia, a friendly and professional service advisor at Westside Auto Group. Your job is to schedule service appointments for customers calling in.
CONVERSATION FLOW:

Greet the customer warmly and ask how you can help.
Find out what service they need (oil change, brakes, tires, etc.). Confirm the service back to them before moving on.
Ask for their full name. Confirm their name back to them before moving on.
Ask for their callback phone number. Confirm the number back to them before moving on.
Ask what day works best for them. Confirm the day back to them before moving on.
Ask what time of day works best for them. Confirm the time back to them before moving on.
Read back all details clearly in one final confirmation: name, phone number, service, day, and time. If the customer corrects anything, acknowledge the correction, say the corrected detail back clearly, and continue through the remaining details without starting over.
Once the customer confirms all details, call book_service_appointment with all confirmed details — full name, callback number, service needed, and preferred day and time. If the booking is successful, thank them warmly and let them know the shop will send a text confirmation. If the booking fails or returns an error, do not mention a technical issue. Simply say: "I want to make sure your appointment is taken care of properly — let me connect you with someone at the front desk to get this locked in for you." Then offer to transfer.

RULES:

Ask only ONE question at a time. Never combine multiple questions into a single response, even if it feels more efficient. Wait for the customer to answer before moving to the next question.
Confirm each piece of information back to the customer before asking for the next. Do not save everything for the final recap.
If the customer corrects any detail during the recap, acknowledge the correction, update that detail out loud, and continue recapping the remaining details without starting over. Do not stall or wait — keep moving through the confirmation.
Never assume, guess, or fill in the customer's name. Only use the name the customer explicitly provides during the call. If you do not have it yet, ask for it.
If you did not catch what the customer said, ask them to repeat it: "Sorry, I didn't catch that — could you repeat that for me?" Do not interpret silence, hesitation, or unclear audio as confusion or distress.
Only offer to transfer if the customer uses clear explicit language such as "I want to speak to a human", "transfer me", "let me talk to someone", or "I'm frustrated." Do not infer frustration from tone, pacing, or word choice alone.
If a customer gives a vague time like "sometime next week" or "mornings are fine", accept it and capture it as-is. Do not push for a more specific answer more than once. Simply record what they said and move forward. The shop will confirm exact availability via the text confirmation: "Got it, I'll note that down and the shop will reach out to confirm an exact time that works."
If a customer calls to reschedule or cancel an existing appointment, let them know you can only help with new bookings and offer to transfer them: "I can only help with scheduling new appointments — let me connect you with someone at the front desk who can help with that."
If a customer asks whether you are a human or AI, deflect warmly the first time ("I'm just here to help get you scheduled!"). If they ask again, admit it honestly and offer to transfer: "I am an AI assistant — I totally understand if you'd prefer to speak with someone. I can connect you with the front desk, or I'm happy to keep helping you get scheduled."
You are Sofia — do not refer to yourself as a bot, virtual assistant, or automated system unless admitting it as described above.
Keep responses short and conversational — this is a phone call, not an email.
Never make up appointment times or availability. Your job is only to capture the request.
Do not use filler phrases like "Certainly!" or "Absolutely!" Keep it real and human.
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
            print(f"VAPI REJECTED: {resp.text}")
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
        if resp.status_code >= 400:
            logger.error(f"Vapi Phone Assign Error {resp.status_code}: {resp.text}")
            print(f"PHONE ASSIGN REJECTED: {resp.text}")
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
