# ─── Database migration scripts (Windows PowerShell) ─────────────────────────
param(
    [string]$Action = "status",
    [string]$Name = "migration"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$DbDir = Join-Path $RootDir "packages/database"

Set-Location $DbDir

switch ($Action) {
    "push" {
        Write-Host "🗄️  Pushing schema to database..." -ForegroundColor Yellow
        pnpm db:push
        Write-Host "✅ Schema pushed" -ForegroundColor Green
    }
    "migrate" {
        Write-Host "🗄️  Creating migration: $Name" -ForegroundColor Yellow
        npx prisma migrate dev --name $Name --schema prisma/schema.prisma
        Write-Host "✅ Migration applied" -ForegroundColor Green
    }
    "deploy" {
        Write-Host "🗄️  Deploying migrations (production)..." -ForegroundColor Yellow
        npx prisma migrate deploy --schema prisma/schema.prisma
        Write-Host "✅ Migrations deployed" -ForegroundColor Green
    }
    "seed" {
        Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
        pnpm db:seed
        Write-Host "✅ Seed complete" -ForegroundColor Green
    }
    "reset" {
        $confirm = Read-Host "⚠️  This will delete ALL data. Type 'yes' to confirm"
        if ($confirm -eq "yes") {
            npx prisma migrate reset --schema prisma/schema.prisma --force
            pnpm db:seed
            Write-Host "✅ Database reset and seeded" -ForegroundColor Green
        } else {
            Write-Host "Cancelled"
        }
    }
    "generate" {
        Write-Host "⚙️  Generating Prisma client..." -ForegroundColor Yellow
        pnpm db:generate
        Write-Host "✅ Prisma client generated" -ForegroundColor Green
    }
    "studio" {
        Write-Host "🎨 Opening Prisma Studio..." -ForegroundColor Cyan
        pnpm db:studio
    }
    "status" {
        Write-Host "📋 Migration status:" -ForegroundColor Cyan
        npx prisma migrate status --schema prisma/schema.prisma
    }
    default {
        Write-Host "Usage: .\migrate.ps1 -Action [push|migrate|deploy|seed|reset|generate|studio|status] [-Name <migration_name>]"
    }
}
