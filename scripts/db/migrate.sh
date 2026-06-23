#!/usr/bin/env bash
# ─── Database migration scripts (Linux/Mac) ───────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "❌ .env not found."
  exit 1
fi

# Load env
set -a
source .env
set +a

ACTION="${1:-status}"
DB_PACKAGE_DIR="packages/database"

case "$ACTION" in
  push)
    echo "🗄️  Pushing schema to database (dev)..."
    cd "$DB_PACKAGE_DIR"
    pnpm db:push
    echo "✅ Schema pushed"
    ;;
  migrate)
    NAME="${2:-migration}"
    echo "🗄️  Creating and applying migration: $NAME"
    cd "$DB_PACKAGE_DIR"
    npx prisma migrate dev --name "$NAME" --schema prisma/schema.prisma
    echo "✅ Migration applied"
    ;;
  deploy)
    echo "🗄️  Deploying pending migrations (production)..."
    cd "$DB_PACKAGE_DIR"
    npx prisma migrate deploy --schema prisma/schema.prisma
    echo "✅ Migrations deployed"
    ;;
  seed)
    echo "🌱 Seeding database..."
    cd "$DB_PACKAGE_DIR"
    pnpm db:seed
    echo "✅ Seed complete"
    ;;
  reset)
    echo "⚠️  Resetting database (all data will be lost)..."
    read -p "Type 'yes' to confirm: " confirm
    if [ "$confirm" = "yes" ]; then
      cd "$DB_PACKAGE_DIR"
      npx prisma migrate reset --schema prisma/schema.prisma --force
      pnpm db:seed
      echo "✅ Database reset and seeded"
    else
      echo "Cancelled"
    fi
    ;;
  generate)
    echo "⚙️  Generating Prisma client..."
    cd "$DB_PACKAGE_DIR"
    pnpm db:generate
    echo "✅ Prisma client generated"
    ;;
  studio)
    echo "🎨 Opening Prisma Studio..."
    cd "$DB_PACKAGE_DIR"
    pnpm db:studio
    ;;
  status)
    echo "📋 Migration status:"
    cd "$DB_PACKAGE_DIR"
    npx prisma migrate status --schema prisma/schema.prisma
    ;;
  *)
    echo "Usage: $0 [push|migrate <name>|deploy|seed|reset|generate|studio|status]"
    exit 1
    ;;
esac
