#!/usr/bin/env bash
# ─── Start development servers (Linux/Mac) ────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "❌ .env not found. Run ./scripts/linux/setup.sh first"
  exit 1
fi

SERVICE="${1:-all}"

case "$SERVICE" in
  api)
    echo "▶️  Starting API only..."
    cd apps/api && pnpm dev
    ;;
  web)
    echo "▶️  Starting Web only..."
    cd apps/web && pnpm dev
    ;;
  infra)
    echo "▶️  Starting infrastructure only (PostgreSQL + Redis)..."
    docker compose -f docker-compose.dev.yml up -d
    ;;
  all|*)
    echo "▶️  Starting all services..."
    docker compose -f docker-compose.dev.yml up -d
    echo "✅ Infrastructure ready"
    echo "🌐 API:  http://localhost:3001"
    echo "📚 Docs: http://localhost:3001/api/docs"
    echo "🖥️  Web:  http://localhost:3000"
    pnpm dev
    ;;
esac
