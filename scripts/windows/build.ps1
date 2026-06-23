# ─── Build project (Windows PowerShell) ──────────────────────────────────────
param(
    [string]$Service = "all"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $RootDir

switch ($Service) {
    "api" {
        Write-Host "🔨 Building API..." -ForegroundColor Yellow
        Set-Location "apps/api"
        pnpm build
        Write-Host "✅ API build complete → apps/api/dist/" -ForegroundColor Green
    }
    "web" {
        Write-Host "🔨 Building Web..." -ForegroundColor Yellow
        Set-Location "apps/web"
        pnpm build
        Write-Host "✅ Web build complete → apps/web/.next/" -ForegroundColor Green
    }
    default {
        Write-Host "🔨 Building all..." -ForegroundColor Yellow
        pnpm build
        Write-Host "✅ All builds complete" -ForegroundColor Green
    }
}
