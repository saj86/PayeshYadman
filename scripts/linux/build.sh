#!/usr/bin/env bash
# ─── Build project (Linux/Mac) ────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT_DIR"

SERVICE="${1:-all}"

case "$SERVICE" in
  api)
    echo "🔨 Building API..."
    cd apps/api && pnpm build
    echo "✅ API build complete → apps/api/dist/"
    ;;
  web)
    echo "🔨 Building Web..."
    cd apps/web && pnpm build
    echo "✅ Web build complete → apps/web/.next/"
    ;;
  all|*)
    echo "🔨 Building all services..."
    pnpm build
    echo "✅ All builds complete"
    ;;
esac
