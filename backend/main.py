from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.orchestrator.event_handler import handle_vapi_event
from app.orchestrator.session_store import get_all_sessions
from app.models.call_models import VapiMessage

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("saafi.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Saafi AI Orchestrator starting up...")
    yield
    logger.info("Saafi AI Orchestrator shutting down.")


app = FastAPI(
    title="Saafi AI Voice Orchestrator",
    description="Event-driven backend for managing AI voice agent calls via Vapi.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down for production
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
# Vapi Webhook — primary integration point
# ---------------------------------------------------------------------------

@app.post("/vapi/webhook", tags=["Vapi"])
async def vapi_webhook(message: VapiMessage):
    """
    Receives all Vapi server messages for the call lifecycle.

    Vapi posts here for:
      - call-start / call-end
      - transcript (partial + final)
      - function-call  (tools like lookup_vehicle, book_appointment)
      - speech-update / status-update

    Returns either an empty 200 or a ToolResult JSON for function-calls.
    """
    logger.info(f"Vapi event received: type={message.type} call_id={message.call.id}")
    response = await handle_vapi_event(message)
    return response


# ---------------------------------------------------------------------------
# Internal API — for the dashboard
# ---------------------------------------------------------------------------

@app.get("/sessions", tags=["Dashboard"])
async def list_sessions():
    """Return all active/recent call sessions (for the Call Logs dashboard)."""
    sessions = await get_all_sessions()
    return {"sessions": [s.model_dump() for s in sessions]}


@app.get("/sessions/{call_id}", tags=["Dashboard"])
async def get_session_detail(call_id: str):
    """Return a single call session by ID."""
    from app.orchestrator.session_store import get_session
    session = await get_session(call_id)
    if session is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return session.model_dump()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
