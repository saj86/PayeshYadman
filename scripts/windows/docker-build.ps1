# ─── Build Docker images (Windows PowerShell) ────────────────────────────────
param(
    [string]$Service = "all",
    [string]$Tag = "latest",
    [string]$Registry = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $RootDir

if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }

# Load env vars from .env
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
        $key = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$Prefix = if ($Registry) { "$Registry/payeshyadman" } else { "payeshyadman" }
$ApiUrl = $env:NEXT_PUBLIC_API_URL ?? "http://localhost:3001"
$WsUrl = $env:NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001"

function Build-Api {
    Write-Host "🐳 Building API image..." -ForegroundColor Yellow
    docker build `
        -f apps/api/Dockerfile `
        -t "${Prefix}-api:${Tag}" `
        -t "${Prefix}-api:latest" `
        .
    Write-Host "✅ API image: ${Prefix}-api:${Tag}" -ForegroundColor Green
}

function Build-Web {
    Write-Host "🐳 Building Web image..." -ForegroundColor Yellow
    docker build `
        -f apps/web/Dockerfile `
        --build-arg "NEXT_PUBLIC_API_URL=${ApiUrl}" `
        --build-arg "NEXT_PUBLIC_WS_URL=${WsUrl}" `
        -t "${Prefix}-web:${Tag}" `
        -t "${Prefix}-web:latest" `
        .
    Write-Host "✅ Web image: ${Prefix}-web:${Tag}" -ForegroundColor Green
}

switch ($Service) {
    "api" { Build-Api }
    "web" { Build-Web }
    default {
        Build-Api
        Build-Web
        Write-Host ""
        Write-Host "✅ All images built:" -ForegroundColor Green
        docker images | Select-String "payeshyadman"
    }
}
