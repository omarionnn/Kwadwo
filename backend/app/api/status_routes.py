"""
Status API — proxies UptimeRobot monitor data for the dashboard status page.

Uses UptimeRobot's getMonitors API to return current status, uptime ratios,
and average response times. Results are cached for 60 seconds.
"""

from __future__ import annotations
import os
import time
import logging
from fastapi import APIRouter, HTTPException
import httpx

logger = logging.getLogger("saafi.status_api")

router = APIRouter(prefix="/api", tags=["Status"])

UPTIMEROBOT_API = "https://api.uptimerobot.com/v2/getMonitors"

# ── Simple in-memory cache ────────────────────────────────────────────────────

_cache: dict = {"data": None, "expires": 0}
CACHE_TTL = 60  # seconds


# ── Status code mapping ──────────────────────────────────────────────────────

STATUS_MAP = {
    0: {"label": "Paused", "color": "gray"},
    1: {"label": "Not Checked Yet", "color": "gray"},
    2: {"label": "Operational", "color": "green"},
    8: {"label": "Seems Down", "color": "yellow"},
    9: {"label": "Down", "color": "red"},
}


@router.get("/status")
async def get_status():
    """Fetch monitor status from UptimeRobot (cached 60s)."""
    now = time.time()

    # Return cached data if still fresh
    if _cache["data"] and now < _cache["expires"]:
        return _cache["data"]

    api_key = os.getenv("UPTIMEROBOT_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="UPTIMEROBOT_API_KEY not configured")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                UPTIMEROBOT_API,
                data={
                    "api_key": api_key,
                    "format": "json",
                    "response_times": "1",
                    "response_times_limit": "1",
                    "custom_uptime_ratios": "1-7-30",
                },
            )
            resp.raise_for_status()
            raw = resp.json()
    except Exception as e:
        logger.error(f"UptimeRobot API error: {e}")
        raise HTTPException(status_code=502, detail="Could not reach UptimeRobot")

    if raw.get("stat") != "ok":
        logger.error(f"UptimeRobot returned error: {raw}")
        raise HTTPException(status_code=502, detail="UptimeRobot returned an error")

    monitors = []
    for m in raw.get("monitors", []):
        status_code = m.get("status", 0)
        status_info = STATUS_MAP.get(status_code, {"label": "Unknown", "color": "gray"})
        uptime_ratios = m.get("custom_uptime_ratio", "0-0-0").split("-")

        # Get latest response time
        response_times = m.get("response_times", [])
        avg_response = response_times[0].get("value", 0) if response_times else 0

        monitors.append({
            "id": m.get("id"),
            "name": m.get("friendly_name", "Unknown"),
            "url": m.get("url", ""),
            "status": status_info["label"],
            "statusColor": status_info["color"],
            "uptimeDay": float(uptime_ratios[0]) if len(uptime_ratios) > 0 else 0,
            "uptimeWeek": float(uptime_ratios[1]) if len(uptime_ratios) > 1 else 0,
            "uptimeMonth": float(uptime_ratios[2]) if len(uptime_ratios) > 2 else 0,
            "responseTime": int(avg_response),
            "lastChecked": m.get("last_check", None),
        })

    result = {"monitors": monitors, "fetched_at": int(now)}

    # Cache the result
    _cache["data"] = result
    _cache["expires"] = now + CACHE_TTL

    return result
