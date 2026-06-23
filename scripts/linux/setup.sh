#!/usr/bin/env bash
# ─── Initial project setup (Linux/Mac) ───────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 Setting up Payeshyadman..."

# Check dependencies
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Installing pnpm..."; npm install -g pnpm; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required"; exit 1; }

# Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📄 Created .env from .env.example — please fill in your secrets"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate JWT secrets if defaults detected
if grep -q "CHANGE_ME_generate" .env; then
  echo "🔐 Generating JWT secrets..."
  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  JWT_REFRESH=$(openssl rand -base64 64 | tr -d '\n')
  sed -i.bak "s|CHANGE_ME_generate_with_openssl_rand_base64_64|${JWT_SECRET}|g" .env
  sed -i.bak "s|CHANGE_ME_generate_a_different_secret_here|${JWT_REFRESH}|g" .env
  rm -f .env.bak
  echo "✅ JWT secrets generated"
fi

# Start infrastructure
echo "🐳 Starting PostgreSQL & Redis..."
docker compose -f docker-compose.dev.yml up -d
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run migrations and seed
echo "🗄️  Running database migrations..."
cd packages/database
pnpm db:push
echo "🌱 Seeding database..."
pnpm db:seed
cd "$ROOT_DIR"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Test credentials (password: Admin1234):"
echo "   admin@payesh.ir       → Super Admin"
echo "   hq@payesh.ir          → HQ Manager"
echo "   inspector@payesh.ir   → Inspector"
echo "   citizen@payesh.ir     → Citizen"
echo "   support@payesh.ir     → Support"
echo "   district@payesh.ir    → District Manager"
echo "   commander@payesh.ir   → Commander"
echo ""
echo "▶️  Run: ./scripts/linux/dev.sh"
