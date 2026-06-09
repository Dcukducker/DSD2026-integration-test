<#
.SYNOPSIS
    DSD 2026 - Start All Services for Integration Testing
.DESCRIPTION
    Starts V2 Backend, App Flask, and M2 Dashboard each in its own CMD window.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\start_all.ps1
#>

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "======================================================================"
Write-Host "  DSD 2026 - Integration Test Launcher"
Write-Host "======================================================================"
Write-Host ""

# ---- Check runtimes ----------------------------------------------------------
Write-Host "[INFO] Checking runtimes..."
$null = Get-Command node -ErrorAction Stop
$null = Get-Command python -ErrorAction Stop
Write-Host "  [OK] Node.js $(node --version)"
Write-Host "  [OK] Python $(python --version 2>&1)"
Write-Host ""

# ---- V2 Backend --------------------------------------------------------------
Write-Host "---- Starting V2 Backend (port 3000)..."
$v2Dir = Join-Path $RootDir "dsd2026-teamv2"
if (-not (Test-Path (Join-Path $v2Dir "node_modules"))) {
    Write-Host "  Installing dependencies..."
    Set-Location $v2Dir; npm install; Set-Location $RootDir
}
Start-Process cmd -ArgumentList "/c", "cd /d `"$v2Dir`" && echo V2 Backend - http://localhost:3000/health && echo. && node src/server.js && pause"

Write-Host "  Waiting for V2 Backend..."
$tries = 0
do {
    Start-Sleep -Seconds 2; $tries++
    try { $null = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 2; break } catch {}
} while ($tries -lt 15)
if ($tries -ge 15) { Write-Host "  [WARN] V2 not responding after 30s" }
else { Write-Host "  [OK] V2 Backend ready" }

# ---- App Flask ---------------------------------------------------------------
Write-Host "---- Starting App (port 5000) - Simulator mode..."
$appDir = Join-Path $RootDir "DSD2026-app-windows"
Start-Process cmd -ArgumentList "/c", "title App-Flask-:5000 && cd /d `"$appDir`" && echo App Web UI - http://localhost:5000 && echo. && python main.py && pause"

Write-Host "  Waiting for App..."
$tries = 0
do {
    Start-Sleep -Seconds 2; $tries++
    try { $null = Invoke-WebRequest -Uri "http://localhost:5000" -TimeoutSec 2 -UseBasicParsing; break } catch {}
} while ($tries -lt 10)
if ($tries -ge 10) { Write-Host "  [WARN] App not responding - check the App window for errors" }
else { Write-Host "  [OK] App ready" }

# ---- M2 Clinical Web ---------------------------------------------------------
Write-Host "---- Starting M2 Dashboard (port 5173)..."
$m2Dir = Join-Path $RootDir "project-main-web\m2-clinical-web"
if (-not (Test-Path (Join-Path $m2Dir "node_modules"))) {
    Write-Host "  Installing dependencies..."
    Set-Location $m2Dir; npm install; Set-Location $RootDir
}
Start-Process cmd -ArgumentList "/c", "title M2-ClinicalWeb-:5173 && cd /d `"$m2Dir`" && echo M2 Dashboard - http://localhost:5173 && echo. && npx vite --host && pause"

Write-Host "  Waiting for M2..."
$tries = 0
do {
    Start-Sleep -Seconds 2; $tries++
    try { $null = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing; break } catch {}
} while ($tries -lt 10)
if ($tries -ge 10) { Write-Host "  [WARN] M2 not responding - check the M2 window for errors" }
else { Write-Host "  [OK] M2 Dashboard ready" }

# ---- Done --------------------------------------------------------------------
Write-Host ""
Write-Host "======================================================================"
Write-Host "  All services launched in separate windows."
Write-Host ""
Write-Host "  V2 Backend:   http://localhost:3000/health"
Write-Host "  App Web UI:   http://localhost:5000"
Write-Host "  M2 Dashboard: http://localhost:5173"
Write-Host ""
Write-Host "  Close each CMD window (Ctrl+C) to stop each service."
Write-Host "======================================================================"
Write-Host ""

Start-Process "http://localhost:5000"
