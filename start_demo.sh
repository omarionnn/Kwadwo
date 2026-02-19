#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start_demo.sh — One-command Saafi AI demo launcher
#
# Usage:
#   chmod +x start_demo.sh
#   ./start_demo.sh
#
# Prerequisites:
#   - .env file with VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, NGROK_AUTHTOKEN
#   - ngrok installed (brew install ngrok)
#   - Python venv at backend/venv
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")/backend"

# ── Load env ──────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "❌  .env file not found. Copy .env.example to .env and fill in your keys."
  exit 1
fi
export $(grep -v '^#' .env | xargs)

if [ -z "$VAPI_API_KEY" ] || [ "$VAPI_API_KEY" = "your_vapi_api_key_here" ]; then
  echo "❌  VAPI_API_KEY not set in .env"
  exit 1
fi

if [ -z "$NGROK_AUTHTOKEN" ] || [ "$NGROK_AUTHTOKEN" = "your_ngrok_authtoken_here" ]; then
  echo "❌  NGROK_AUTHTOKEN not set in .env"
  exit 1
fi

# ── Configure ngrok authtoken ─────────────────────────────────────────────────
ngrok config add-authtoken "$NGROK_AUTHTOKEN" --quiet 2>/dev/null || true

# ── Start ngrok in background ─────────────────────────────────────────────────
echo "🌐  Starting ngrok tunnel on port 8000..."
ngrok http 8000 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to be ready
for i in {1..15}; do
  TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null \
    | python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(t[0]['public_url'])" 2>/dev/null || true)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌  Could not start ngrok tunnel. Is ngrok installed? (brew install ngrok)"
  kill $NGROK_PID 2>/dev/null
  exit 1
fi

echo "✅  Tunnel: $TUNNEL_URL"

# ── Start backend ─────────────────────────────────────────────────────────────
source venv/bin/activate
echo "🚀  Starting backend at http://localhost:8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info &
UVICORN_PID=$!
sleep 2

# ── Provision Vapi assistant ──────────────────────────────────────────────────
echo ""
echo "⚙️   Provisioning Vapi assistant..."
SETUP_RESPONSE=$(curl -s -X POST http://localhost:8000/setup/vapi \
  -H "Content-Type: application/json" \
  -d "{
    \"api_key\": \"$VAPI_API_KEY\",
    \"phone_number_id\": \"$VAPI_PHONE_NUMBER_ID\",
    \"webhook_url\": \"$TUNNEL_URL\"
  }")

PHONE_NUM=$(echo "$SETUP_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('phone_number','[see Vapi dashboard]'))" 2>/dev/null || echo "[see Vapi dashboard]")
ASSISTANT_ID=$(echo "$SETUP_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('assistant_id',''))" 2>/dev/null || echo "")

# ── Print demo info ───────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉  Saafi AI Demo is LIVE"
echo ""
echo "  📞  Call this number:  $PHONE_NUM"
echo "  🌐  Public webhook:    $TUNNEL_URL/vapi/webhook"
echo "  📊  Dashboard:         http://localhost:3001"
echo "  🔧  API docs:          http://localhost:8000/docs"
echo "  🤖  Assistant ID:      $ASSISTANT_ID"
echo ""
echo "  Test script:  Say 'I need a service appointment for my"
echo "                F-150, VIN ends in 4872'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Cleanup on exit ───────────────────────────────────────────────────────────
trap "echo ''; echo '👋  Shutting down...'; kill $NGROK_PID $UVICORN_PID 2>/dev/null" EXIT INT TERM

wait $UVICORN_PID
