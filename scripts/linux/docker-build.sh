#!/usr/bin/env bash
# ─── Build Docker images (Linux/Mac) ─────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then cp .env.example .env; fi
source .env 2>/dev/null || true

TAG="${IMAGE_TAG:-latest}"
REGISTRY="${REGISTRY:-}"
PREFIX="${REGISTRY:+${REGISTRY}/}payeshyadman"

SERVICE="${1:-all}"

build_api() {
  echo "🐳 Building API image..."
  docker build \
    -f apps/api/Dockerfile \
    -t "${PREFIX}-api:${TAG}" \
    -t "${PREFIX}-api:latest" \
    .
  echo "✅ API image: ${PREFIX}-api:${TAG}"
}

build_web() {
  echo "🐳 Building Web image..."
  docker build \
    -f apps/web/Dockerfile \
    --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:3001}" \
    --build-arg "NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-ws://localhost:3001}" \
    -t "${PREFIX}-web:${TAG}" \
    -t "${PREFIX}-web:latest" \
    .
  echo "✅ Web image: ${PREFIX}-web:${TAG}"
}

case "$SERVICE" in
  api) build_api ;;
  web) build_web ;;
  all|*)
    build_api
    build_web
    echo ""
    echo "✅ All images built:"
    docker images | grep payeshyadman
    ;;
esac
