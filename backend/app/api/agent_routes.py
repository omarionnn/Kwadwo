"""
Agent API — GET and PATCH the live Vapi assistant config.

Proxies requests to Vapi's REST API so the frontend Agent Builder
can read and update the real Sofia assistant without exposing the API key.
"""

from __future__ import annotations
import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx

logger = logging.getLogger("saafi.agent_api")

router = APIRouter(prefix="/api", tags=["Agent Builder"])

VAPI_BASE = "https://api.vapi.ai"


def _headers() -> dict:
    key = os.getenv("VAPI_API_KEY", "")
    return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def _assistant_id() -> str:
    aid = os.getenv("VAPI_ASSISTANT_ID", "")
    if not aid:
        raise HTTPException(status_code=500, detail="VAPI_ASSISTANT_ID not set")
    return aid


# ── Response shape ────────────────────────────────────────────────────────────

class VoiceConfig(BaseModel):
    provider: str = ""
    voiceId: str = ""

class ToolFunctionParam(BaseModel):
    type: str = "object"
    properties: dict = {}
    required: list[str] = []

class ToolFunction(BaseModel):
    name: str = ""
    description: str = ""
    parameters: ToolFunctionParam = ToolFunctionParam()

class ToolDef(BaseModel):
    type: str = "function"
    function: ToolFunction = ToolFunction()

class AgentConfig(BaseModel):
    id: str
    name: str = ""
    firstMessage: str = ""
    systemPrompt: str = ""
    model: str = ""
    temperature: float = 0.5
    voice: VoiceConfig = VoiceConfig()
    tools: list[ToolDef] = []


class AgentPatchRequest(BaseModel):
    name: Optional[str] = None
    firstMessage: Optional[str] = None
    systemPrompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    voiceProvider: Optional[str] = None
    voiceId: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_config(raw: dict) -> AgentConfig:
    """Normalize Vapi's assistant response into our AgentConfig shape."""
    model_cfg = raw.get("model", {})
    messages = model_cfg.get("messages", [])
    system_prompt = ""
    for m in messages:
        if m.get("role") == "system":
            system_prompt = m.get("content", "")
            break

    voice_cfg = raw.get("voice", {})
    tools_raw = model_cfg.get("tools", [])
    tools = []
    for t in tools_raw:
        fn = t.get("function", {})
        params = fn.get("parameters", {})
        tools.append(ToolDef(
            type=t.get("type", "function"),
            function=ToolFunction(
                name=fn.get("name", ""),
                description=fn.get("description", ""),
                parameters=ToolFunctionParam(
                    type=params.get("type", "object"),
                    properties=params.get("properties", {}),
                    required=params.get("required", []),
                ),
            ),
        ))

    return AgentConfig(
        id=raw.get("id", ""),
        name=raw.get("name", ""),
        firstMessage=raw.get("firstMessage", ""),
        systemPrompt=system_prompt,
        model=model_cfg.get("model", ""),
        temperature=model_cfg.get("temperature", 0.5),
        voice=VoiceConfig(
            provider=voice_cfg.get("provider", ""),
            voiceId=voice_cfg.get("voiceId", ""),
        ),
        tools=tools,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/agent", response_model=AgentConfig)
async def get_agent():
    """Fetch the current Sofia assistant config from Vapi."""
    aid = _assistant_id()
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{VAPI_BASE}/assistant/{aid}",
            headers=_headers(),
        )
        if resp.status_code >= 400:
            logger.error(f"Vapi GET assistant error: {resp.status_code} {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch agent config")
        return _extract_config(resp.json())


@router.patch("/agent", response_model=AgentConfig)
async def update_agent(patch: AgentPatchRequest):
    """Update the live Sofia assistant on Vapi.

    Fetches the current config first so we can deep-merge model changes
    instead of overwriting the entire model object (which would wipe tools,
    model name, temperature, etc.).
    """
    aid = _assistant_id()

    async with httpx.AsyncClient(timeout=15) as client:
        # ── 1. Fetch current assistant config ────────────────────────────
        current_resp = await client.get(
            f"{VAPI_BASE}/assistant/{aid}",
            headers=_headers(),
        )
        if current_resp.status_code >= 400:
            logger.error(f"Vapi GET error before patch: {current_resp.status_code} {current_resp.text}")
            raise HTTPException(status_code=current_resp.status_code, detail="Failed to fetch current config")
        current = current_resp.json()

        # ── 2. Build Vapi-shaped payload with deep merge ─────────────────
        payload: dict = {}

        if patch.name is not None:
            payload["name"] = patch.name

        if patch.firstMessage is not None:
            payload["firstMessage"] = patch.firstMessage

        # Deep-merge model fields into existing model config
        model_cfg = current.get("model", {})
        model_changed = False

        if patch.systemPrompt is not None:
            model_cfg["messages"] = [{"role": "system", "content": patch.systemPrompt}]
            model_changed = True
        if patch.model is not None:
            model_cfg["model"] = patch.model
            model_changed = True
        if patch.temperature is not None:
            model_cfg["temperature"] = patch.temperature
            model_changed = True

        if model_changed:
            # Ensure provider is always present
            model_cfg.setdefault("provider", "openai")
            payload["model"] = model_cfg

        # Deep-merge voice fields into existing voice config
        if patch.voiceProvider is not None or patch.voiceId is not None:
            voice_cfg = current.get("voice", {})
            if patch.voiceProvider is not None:
                voice_cfg["provider"] = patch.voiceProvider
            if patch.voiceId is not None:
                voice_cfg["voiceId"] = patch.voiceId
            voice_cfg.setdefault("provider", "openai")
            payload["voice"] = voice_cfg

        if not payload:
            raise HTTPException(status_code=400, detail="No fields to update")

        logger.info(f"Patching Vapi assistant {aid}: {list(payload.keys())}")

        # ── 3. Send merged payload ───────────────────────────────────────
        resp = await client.patch(
            f"{VAPI_BASE}/assistant/{aid}",
            headers=_headers(),
            json=payload,
        )
        if resp.status_code >= 400:
            logger.error(f"Vapi PATCH error: {resp.status_code} {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"Vapi update failed: {resp.text}")
        return _extract_config(resp.json())
