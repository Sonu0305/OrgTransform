#!/usr/bin/env bash
set -euo pipefail

pkill -f "uvicorn backend.app.main:app" || true
pkill -f "next dev --hostname 0.0.0.0 --port 3000" || true

