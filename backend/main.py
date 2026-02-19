from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import logging
import os
from dotenv import load_dotenv

from app.orchestrator.event_handler import handle_vapi_event
from app.orchestrator.session_store import get_all_sessions, get_session, _load_from_disk
from app.models.call_models import VapiMessage
from app.vapi.provisioner import create_assistant, assign_phone_number, get_phone_number_info
import json as _json

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("saafi.main")

# ── Runtime state ─────────────────────────────────────────────────────────────
_config: dict = {
    "assistant_id": os.getenv("VAPI_ASSISTANT_ID"),   # pre-provisioned assistant
    "phone_number": None,
    "phone_number_id": os.getenv("VAPI_PHONE_NUMBER_ID"),
    "webhook_url": os.getenv("PUBLIC_WEBHOOK_URL"),
}

# Last raw payload from Vapi (for debugging)
_last_payload: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Saafi AI Orchestrator starting up...")

    # ── Load persisted call sessions from disk ────────────────────────────
    _load_from_disk()

    api_key  = os.getenv("VAPI_API_KEY", "")
    phone_id = os.getenv("VAPI_PHONE_NUMBER_ID", "")
    webhook  = os.getenv("PUBLIC_WEBHOOK_URL", "")
    saved_asst = os.getenv("VAPI_ASSISTANT_ID", "")

    # ── If we already have an assistant ID, just look up the phone number ─
    if saved_asst and api_key and phone_id:
        try:
            info = await get_phone_number_info(api_key, phone_id)
            _config["assistant_id"] = saved_asst
            _config["phone_number"] = info.get("number")
            _config["webhook_url"]  = webhook
            logger.info(f"Using stored assistant {saved_asst} → phone {_config['phone_number']}")
        except Exception as e:
            logger.warning(f"Could not fetch phone number info: {e}")

    # ── Otherwise provision a brand-new assistant ─────────────────────────
    elif api_key and api_key != "your_vapi_api_key_here" and phone_id and webhook:
        try:
            logger.info("Auto-provisioning NEW Vapi assistant from env vars...")
            assistant = await create_assistant(api_key, webhook)
            await assign_phone_number(api_key, phone_id, assistant["id"])
            info = await get_phone_number_info(api_key, phone_id)
            _config["assistant_id"] = assistant["id"]
            _config["phone_number"] = info.get("number")
            _config["webhook_url"]  = webhook
            logger.info(f"Auto-provisioned: {_config['phone_number']} → assistant {assistant['id']}")
            logger.info(f"Add VAPI_ASSISTANT_ID={assistant['id']} to .env to avoid re-provisioning")
        except Exception as e:
            logger.warning(f"Auto-provision skipped: {e}")

    else:
        logger.info("No VAPI_API_KEY/PHONE/WEBHOOK set — skipping provisioning (tests OK)")

    yield
    logger.info("Saafi AI Orchestrator shutting down.")



app = FastAPI(
    title="Saafi AI Voice Orchestrator",
    description="Event-driven backend for managing AI voice agent calls via Vapi.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def root():
    return {"service": "Saafi AI Voice Orchestrator", "status": "running"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Config — lets the dashboard know if a demo number is live
# ---------------------------------------------------------------------------

@app.get("/config", tags=["Config"])
async def get_config():
    """Return current demo configuration (phone number, assistant ID, etc.)."""
    return {
        "phone_number": _config.get("phone_number"),
        "assistant_id": _config.get("assistant_id"),
        "webhook_url": _config.get("webhook_url"),
        "demo_ready": bool(_config.get("phone_number")),
    }


# ---------------------------------------------------------------------------
# Vapi Setup — called by start_demo.sh or manually
# ---------------------------------------------------------------------------

class SetupRequest(BaseModel):
    api_key: str
    phone_number_id: str
    webhook_url: str


@app.post("/setup/vapi", tags=["Config"])
async def setup_vapi(req: SetupRequest):
    """
    Create a Vapi assistant and assign it to a phone number.
    Returns the assistant ID and the human-readable phone number.
    """
    try:
        assistant = await create_assistant(req.api_key, req.webhook_url)
        phone_info = await assign_phone_number(req.api_key, req.phone_number_id, assistant["id"])
        number = phone_info.get("number") or phone_info.get("phoneNumber", {}).get("number")

        _config["assistant_id"] = assistant["id"]
        _config["phone_number"] = number
        _config["webhook_url"] = req.webhook_url

        logger.info(f"Setup complete: phone={number} assistant={assistant['id']}")
        return {
            "success": True,
            "assistant_id": assistant["id"],
            "phone_number": number,
            "webhook_url": f"{req.webhook_url}/vapi/webhook",
            "message": f"✅ Ready! Call {number} to test the AI agent.",
        }
    except Exception as e:
        logger.error(f"Vapi setup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Vapi Webhook
# ---------------------------------------------------------------------------

@app.post("/vapi/webhook", tags=["Vapi"])
async def vapi_webhook(payload: dict):
    """
    Receives all Vapi server messages for the call lifecycle.

    Vapi wraps every event in a top-level 'message' key:
      {"message": {"type": "...", "call": {...}, ...}}

    We unwrap it here before parsing into VapiMessage.
    Returns either {} or a ToolResult JSON for function-calls.
    """
    global _last_payload
    _last_payload = payload  # store for /debug/last-payload

    # Unwrap the Vapi envelope
    inner = payload.get("message", payload)
    evt_type = inner.get("type", "UNKNOWN")
    call_id  = inner.get("call", {}).get("id", "?")

    logger.info(f"Vapi webhook RECEIVED: type={evt_type}  call_id={call_id}")
    logger.info(f"Raw payload keys: {list(inner.keys())}")

    # Log the full payload (truncated for safety)
    try:
        payload_str = _json.dumps(inner, default=str)
        logger.info(f"Payload (first 800 chars): {payload_str[:800]}")
    except Exception:
        pass

    try:
        message = VapiMessage.model_validate(inner)
    except Exception as e:
        logger.warning(f"Failed to parse Vapi message (type={evt_type}): {e}")
        logger.warning(f"Full inner payload: {inner}")
        return {}  # Don't crash — Vapi expects 200 back regardless

    response = await handle_vapi_event(message)
    return response


# ---------------------------------------------------------------------------
# Debug endpoint — see the last raw webhook payload Vapi sent
# ---------------------------------------------------------------------------

@app.get("/debug/last-payload", tags=["Debug"])
async def last_payload():
    """Returns the last raw payload received from Vapi. Useful for debugging tool-call format."""
    return {"last_payload": _last_payload}


# ---------------------------------------------------------------------------
# Dashboard API
# ---------------------------------------------------------------------------

@app.get("/sessions", tags=["Dashboard"])
async def list_sessions():
    sessions = await get_all_sessions()
    return {"sessions": [s.model_dump() for s in sessions]}


@app.get("/sessions/{call_id}", tags=["Dashboard"])
async def get_session_detail(call_id: str):
    session = await get_session(call_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.model_dump()


if __name__ == "__main__":
    import uvicorn
    # Use PORT from environment (default to 8000 for local dev)
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
