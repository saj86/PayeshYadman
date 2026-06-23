#!/usr/bin/env bash
# ─── Run Docker Compose (Linux/Mac) ──────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "❌ .env not found. Copy .env.example to .env and fill in secrets."
  exit 1
fi

ACTION="${1:-up}"

case "$ACTION" in
  up|start)
    echo "🐳 Starting all services with Docker Compose..."
    docker compose up -d
    echo ""
    echo "✅ Services started:"
    docker compose ps
    echo ""
    echo "🌐 API:  http://localhost:${API_PORT:-3001}"
    echo "📚 Docs: http://localhost:${API_PORT:-3001}/api/docs"
    echo "🖥️  Web:  http://localhost:${WEB_PORT:-3000}"
    ;;
  down|stop)
    echo "🛑 Stopping all services..."
    docker compose down
    ;;
  restart)
    echo "🔄 Restarting services..."
    docker compose down && docker compose up -d
    ;;
  logs)
    docker compose logs -f "${2:-}"
    ;;
  ps|status)
    docker compose ps
    ;;
  *)
    echo "Usage: $0 [up|down|restart|logs|ps]"
    exit 1
    ;;
esac
