# ─── Run Docker Compose (Windows PowerShell) ─────────────────────────────────
param(
    [string]$Action = "up",
    [string]$ServiceName = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $RootDir

if (-not (Test-Path ".env")) {
    Write-Error ".env not found. Copy .env.example to .env and fill in secrets."
}

switch ($Action) {
    { $_ -in "up", "start" } {
        Write-Host "🐳 Starting all services with Docker Compose..." -ForegroundColor Cyan
        docker compose up -d
        Write-Host ""
        Write-Host "✅ Services started:" -ForegroundColor Green
        docker compose ps
        Write-Host ""
        Write-Host "🌐 API:  http://localhost:3001"
        Write-Host "📚 Docs: http://localhost:3001/api/docs"
        Write-Host "🖥️  Web:  http://localhost:3000"
    }
    { $_ -in "down", "stop" } {
        Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
        docker compose down
    }
    "restart" {
        Write-Host "🔄 Restarting services..." -ForegroundColor Yellow
        docker compose down
        docker compose up -d
    }
    "logs" {
        if ($ServiceName) {
            docker compose logs -f $ServiceName
        } else {
            docker compose logs -f
        }
    }
    { $_ -in "ps", "status" } {
        docker compose ps
    }
    default {
        Write-Host "Usage: .\docker-run.ps1 [-Action up|down|restart|logs|ps] [-ServiceName <name>]"
    }
}
