#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d ".venv" ]]; then
  echo "Missing .venv. Run: python3 -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt"
  exit 1
fi

source .venv/bin/activate

uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!

npm --prefix frontend run dev -- --hostname 0.0.0.0 --port 3000 &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

echo "CMIS API: http://127.0.0.1:8000/docs"
echo "CMIS Web: http://127.0.0.1:3000"

wait
