# سامانه نظارت شهرداری تهران
## Municipality Inspection & Monitoring Platform

A production-ready monorepo MVP for municipality inspection, citizen reporting, accommodation management, and real-time operational monitoring.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS + Fastify |
| Database | PostgreSQL (PostGIS) + Prisma ORM |
| Cache/Queue | Redis + BullMQ |
| Frontend/Admin | Next.js 14 App Router |
| Mobile/PWA | Next.js PWA (role-based routing) |
| Auth | JWT access + refresh token |
| Monorepo | pnpm workspaces + Turborepo |

---

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker Desktop

### 1. Clone & Setup

```bash
git clone <repo-url>
cd payeshyadman

# Linux / Mac
./scripts/linux/setup.sh

# Windows (PowerShell — run as Administrator)
.\scripts\windows\setup.ps1
```

This will:
- Copy `.env.example` → `.env` and generate JWT secrets
- Install all dependencies
- Start PostgreSQL & Redis via Docker
- Run database migrations
- Seed test data

### 2. Start Development

```bash
# Linux / Mac
./scripts/linux/dev.sh

# Windows
.\scripts\windows\dev.ps1

# Or using pnpm scripts directly
pnpm infra:up    # Start PostgreSQL + Redis
pnpm dev         # Start API + Web
```

### 3. Open in Browser

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/docs |
| Prisma Studio | `pnpm db:studio` |

---

## Test Credentials

All test users have password: **Admin1234**

| Email | Role | App |
|-------|------|-----|
| admin@payesh.ir | Super Admin | Admin + HQ + Support |
| hq@payesh.ir | HQ Manager | HQ Dashboard |
| commander@payesh.ir | Commander | District |
| inspector@payesh.ir | Inspector | Inspector PWA |
| district@payesh.ir | District Manager | District |
| citizen@payesh.ir | Citizen | Citizen PWA |
| support@payesh.ir | Support | Support Panel |

---

## Database Commands

```bash
# Push schema changes (dev, no migration files)
pnpm db:push

# Create a named migration
pnpm db:migrate
pnpm db:migrate:name add_feature

# Deploy migrations (production)
pnpm db:deploy

# Seed data
pnpm db:seed

# Reset database (DEV ONLY — deletes all data)
pnpm db:reset

# Open Prisma Studio (visual DB browser)
pnpm db:studio

# Check migration status
pnpm db:status

# Using the migration script directly (Linux/Mac)
./scripts/db/migrate.sh push
./scripts/db/migrate.sh migrate new_feature
./scripts/db/migrate.sh deploy
./scripts/db/migrate.sh seed
./scripts/db/migrate.sh status

# Windows
.\scripts\windows\migrate.ps1 -Action push
.\scripts\windows\migrate.ps1 -Action migrate -Name new_feature
.\scripts\windows\migrate.ps1 -Action deploy
.\scripts\windows\migrate.ps1 -Action seed
```

---

## Docker Commands

### Build Images

```bash
# Linux / Mac
./scripts/linux/docker-build.sh          # build all
./scripts/linux/docker-build.sh api      # build API only
./scripts/linux/docker-build.sh web      # build Web only

# Windows (PowerShell)
.\scripts\windows\docker-build.ps1
.\scripts\windows\docker-build.ps1 -Service api
.\scripts\windows\docker-build.ps1 -Service web -Tag v1.0.0

# Using pnpm scripts
pnpm docker:build
pnpm docker:build:api
pnpm docker:build:web
```

### Run with Docker Compose

```bash
# Linux / Mac
./scripts/linux/docker-run.sh up         # start all
./scripts/linux/docker-run.sh down       # stop all
./scripts/linux/docker-run.sh logs       # tail logs
./scripts/linux/docker-run.sh logs api   # tail API logs
./scripts/linux/docker-run.sh restart
./scripts/linux/docker-run.sh ps

# Windows (PowerShell)
.\scripts\windows\docker-run.ps1 -Action up
.\scripts\windows\docker-run.ps1 -Action down
.\scripts\windows\docker-run.ps1 -Action logs -ServiceName api
.\scripts\windows\docker-run.ps1 -Action ps

# Using pnpm scripts
pnpm docker:up
pnpm docker:down
pnpm docker:logs
pnpm docker:ps
pnpm docker:restart
```

### Dev Infrastructure Only (no app containers)

```bash
pnpm infra:up       # Start PostgreSQL + Redis only
pnpm infra:down     # Stop infrastructure
```

---

## Build Commands

```bash
# Build all
pnpm build

# Build specific service
pnpm build:api
pnpm build:web

# Linux / Mac scripts
./scripts/linux/build.sh
./scripts/linux/build.sh api
./scripts/linux/build.sh web

# Windows
.\scripts\windows\build.ps1
.\scripts\windows\build.ps1 -Service api
```

---

## Project Structure

```
payeshyadman/
├── apps/
│   ├── api/                    # NestJS backend
│   │   └── src/
│   │       ├── modules/        # Feature modules
│   │       ├── common/         # Guards, filters, interceptors
│   │       ├── prisma/         # Database service
│   │       └── config/         # Configuration & validation
│   └── web/                    # Next.js frontend
│       ├── app/                # App Router pages
│       │   ├── hq/             # HQ Dashboard
│       │   ├── inspector/      # Inspector PWA
│       │   ├── citizen/        # Citizen PWA
│       │   ├── district/       # District entry
│       │   ├── support/        # Support panel
│       │   └── admin/          # Super admin
│       ├── components/         # Shared UI components
│       └── lib/                # API client, auth helpers
├── packages/
│   └── database/               # Prisma schema & seeds
│       └── prisma/
│           ├── schema.prisma   # Database schema
│           └── seed.ts         # Seed data
├── scripts/
│   ├── linux/                  # Bash scripts (Linux/Mac)
│   ├── windows/                # PowerShell scripts (Windows)
│   └── db/                     # Database migration scripts
├── docker-compose.yml          # Production Docker Compose
├── docker-compose.dev.yml      # Dev infrastructure only
└── .env.example                # Environment variable template
```

---

## User Roles & App Access

| Role | App | Features |
|------|-----|---------|
| SUPER_ADMIN | Admin + HQ + Support | Full access |
| HQ_MANAGER | HQ | Dashboard, map, reports, hierarchy |
| COMMANDER | District | Review records, assign inspectors |
| INSPECTOR | Inspector | Field inspection, checklist, approve/reject |
| DISTRICT_MANAGER | District | Submit inspection records |
| CITIZEN | Citizen | Reports, accommodation, lost/found, emergency |
| SUPPORT | Support | Users, tickets, system health |
| ACCOMMODATION_MANAGER | District | Manage accommodation places |

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `JWT_REFRESH_SECRET` — Refresh token secret (must differ from JWT_SECRET)

**Optional:**
- `REDIS_URL` — Redis connection (default: `redis://localhost:6379`)
- `CORS_ORIGINS` — Allowed origins comma-separated (default: `http://localhost:3000`)
- `SMTP_*` — Email config for password reset delivery

---

## Security Features

- JWT access (15m) + refresh token (7d) rotation
- Account lockout after 5 failed login attempts (15 min window)
- Global rate limiting, stricter limits per sensitive endpoint
- Helmet security headers
- CORS restricted by environment
- Bcrypt password hashing (cost 12)
- Input validation on all endpoints via class-validator
- Audit logging for all state-changing operations
- Role-based access control (RBAC) via guards
- Persian error messages to users — no stack traces in production
- File upload validation (type + size limits)
- No hardcoded secrets — all configuration via environment variables

---

## API Documentation

Swagger UI is available at `http://localhost:3001/api/docs` in development mode only.

Main API groups:
- `POST /auth/register` — Public citizen self-registration
- `POST /auth/login` — Login with email/password
- `GET /auth/me` — Current user profile
- `POST /auth/refresh` — Refresh access token
- `POST /auth/forgot-password` — Request password reset
- `POST /auth/reset-password` — Complete password reset
- `GET /dashboard/hq` — HQ statistics (all from DB)
- `GET /inspections` — List inspections (paginated, role-filtered)
- `POST /inspections/:id/review` — Submit inspection review with checklist
- `GET /reports` — Citizen reports (admin sees all, citizen sees own)
- `GET /lost-found` — Missing/found persons
- `POST /emergency` — Emergency report
- `GET /notifications/stream` — Server-sent events real-time stream
