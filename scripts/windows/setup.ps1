# ─── Initial project setup (Windows PowerShell) ─────────────────────────────
param(
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $RootDir

Write-Host "🚀 Setting up Payeshyadman..." -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required. Download from https://nodejs.org"
}

# Check pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Check Docker
if (-not $SkipDocker -and -not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker Desktop is required. Download from https://www.docker.com/products/docker-desktop"
}

# Copy .env
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "📄 Created .env from .env.example — please fill in JWT_SECRET and JWT_REFRESH_SECRET" -ForegroundColor Yellow

    # Generate random secrets on Windows
    $jwtSecret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
    $refreshSecret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
    (Get-Content ".env") `
        -replace "CHANGE_ME_generate_with_openssl_rand_base64_64", $jwtSecret `
        -replace "CHANGE_ME_generate_a_different_secret_here", $refreshSecret |
        Set-Content ".env"
    Write-Host "✅ JWT secrets generated" -ForegroundColor Green
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

# Start infrastructure
if (-not $SkipDocker) {
    Write-Host "🐳 Starting PostgreSQL & Redis..." -ForegroundColor Yellow
    docker compose -f docker-compose.dev.yml up -d
    Write-Host "⏳ Waiting for PostgreSQL..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8
}

# Run migrations and seed
Write-Host "🗄️  Running database setup..." -ForegroundColor Yellow
Set-Location "packages/database"
pnpm db:push
pnpm db:seed
Set-Location $RootDir

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Test credentials (password: Admin1234):" -ForegroundColor Cyan
Write-Host "   admin@payesh.ir       → Super Admin"
Write-Host "   hq@payesh.ir          → HQ Manager"
Write-Host "   inspector@payesh.ir   → Inspector"
Write-Host "   citizen@payesh.ir     → Citizen"
Write-Host "   support@payesh.ir     → Support"
Write-Host ""
Write-Host "▶️  Run: .\scripts\windows\dev.ps1" -ForegroundColor Cyan
