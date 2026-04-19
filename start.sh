#!/usr/bin/env bash
# La Chambre du Débat — launcher pour macOS / Linux.
# - crée un venv Python si besoin
# - installe les deps backend + frontend
# - vérifie que backend/.env est rempli
# - lance les deux serveurs et les tue proprement au Ctrl+C

set -e
cd "$(dirname "$0")"

# --- Prérequis -------------------------------------------------------------
command -v python3 >/dev/null 2>&1 || { echo "✗ Python 3 introuvable. Installez-le depuis https://www.python.org/downloads/"; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "✗ Node.js introuvable. Installez-le depuis https://nodejs.org/"; exit 1; }
command -v npm     >/dev/null 2>&1 || { echo "✗ npm introuvable (fourni avec Node.js)"; exit 1; }

# --- Backend ---------------------------------------------------------------
echo "▶ backend : préparation…"
pushd backend >/dev/null
  if [ ! -d .venv ]; then
    python3 -m venv .venv
  fi
  # shellcheck disable=SC1091
  source .venv/bin/activate
  python -m pip install --quiet --upgrade pip
  python -m pip install --quiet -r requirements.txt

  if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "⚠ backend/.env créé à partir du modèle."
    echo "   Ouvre ce fichier et renseigne :"
    echo "     - ANTHROPIC_API_KEY  (clé Claude)"
    echo "     - ELEVENLABS_API_KEY (clé ElevenLabs)"
    echo ""
    echo "   Relance ensuite ./start.sh"
    ${EDITOR:-open} .env 2>/dev/null || nano .env || true
    popd >/dev/null
    exit 1
  fi
popd >/dev/null

# --- Frontend --------------------------------------------------------------
echo "▶ frontend : préparation…"
pushd frontend >/dev/null
  if [ ! -d node_modules ]; then
    npm install --silent
  fi
popd >/dev/null

# --- Lancement -------------------------------------------------------------
cleanup() {
  echo ""
  echo "⇣ arrêt…"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "▶ démarrage du backend sur :8787"
(
  cd backend
  # shellcheck disable=SC1091
  source .venv/bin/activate
  exec python -m uvicorn main:app --host 0.0.0.0 --port 8787 --log-level warning
) &
BACKEND_PID=$!

echo "▶ démarrage du frontend sur :5280"
(
  cd frontend
  exec ./node_modules/.bin/vite --host --port 5280 --strictPort
) &
FRONTEND_PID=$!

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "")
echo ""
echo "═══════════════════════════════════════════════════════"
echo "   La Chambre du Débat"
echo "   ► http://localhost:5280"
[ -n "$LAN_IP" ] && echo "   ► http://$LAN_IP:5280  (autres appareils du réseau)"
echo ""
echo "   Ctrl+C pour arrêter"
echo "═══════════════════════════════════════════════════════"

wait
