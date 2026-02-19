from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import logging
import os
from dotenv import load_dotenv

from app.orchestrator.event_handler import handle_vapi_event
from app.orchestrator.session_store import get_all_sessions, get_session
from app.models.call_models import VapiMessage
from app.vapi.provisioner import create_assistant, assign_phone_number, get_phone_number_info

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("saafi.main")

# Runtime state — populated after /setup/vapi is called
_config: dict = {
    "assistant_id": None,
    "phone_number": None,
    "phone_number_id": os.getenv("VAPI_PHONE_NUMBER_ID"),
    "webhook_url": os.getenv("PUBLIC_WEBHOOK_URL"),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Saafi AI Orchestrator starting up...")
    # Auto-provision if keys are present and we have no assistant yet
    api_key = os.getenv("VAPI_API_KEY")
    phone_id = os.getenv("VAPI_PHONE_NUMBER_ID")
    webhook = os.getenv("PUBLIC_WEBHOOK_URL")
    if api_key and api_key != "your_vapi_api_key_here" and phone_id and webhook:
        try:
            logger.info("Auto-provisioning Vapi assistant from env vars...")
            assistant = await create_assistant(api_key, webhook)
            await assign_phone_number(api_key, phone_id, assistant["id"])
            info = await get_phone_number_info(api_key, phone_id)
            _config["assistant_id"] = assistant["id"]
            _config["phone_number"] = info.get("number")
            logger.info(f"Auto-provisioned: {_config['phone_number']} → assistant {assistant['id']}")
        except Exception as e:
            logger.warning(f"Auto-provision skipped: {e}")
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
async def vapi_webhook(message: VapiMessage):
    """
    Receives all Vapi server messages for the call lifecycle.
    Returns either {} or a ToolResult JSON for function-calls.
    """
    logger.info(f"Vapi event: type={message.type} call_id={message.call.id}")
    response = await handle_vapi_event(message)
    return response


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
    uvicorn.run(app, host="0.0.0.0", port=8000)
