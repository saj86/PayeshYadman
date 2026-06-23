# ─── Start development servers (Windows PowerShell) ──────────────────────────
param(
    [string]$Service = "all"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $RootDir

if (-not (Test-Path ".env")) {
    Write-Error ".env not found. Run .\scripts\windows\setup.ps1 first"
}

switch ($Service) {
    "api" {
        Write-Host "▶️  Starting API..." -ForegroundColor Cyan
        Set-Location "apps/api"
        pnpm dev
    }
    "web" {
        Write-Host "▶️  Starting Web..." -ForegroundColor Cyan
        Set-Location "apps/web"
        pnpm dev
    }
    "infra" {
        Write-Host "▶️  Starting infrastructure..." -ForegroundColor Cyan
        docker compose -f docker-compose.dev.yml up -d
    }
    default {
        Write-Host "▶️  Starting all services..." -ForegroundColor Cyan
        docker compose -f docker-compose.dev.yml up -d
        Write-Host "✅ Infrastructure ready" -ForegroundColor Green
        Write-Host "🌐 API:  http://localhost:3001"
        Write-Host "📚 Docs: http://localhost:3001/api/docs"
        Write-Host "🖥️  Web:  http://localhost:3000"
        pnpm dev
    }
}
