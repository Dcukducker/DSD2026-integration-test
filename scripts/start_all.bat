@echo off
setlocal enabledelayedexpansion

REM =============================================================================
REM Integration Test - One-Click Start All Services (Windows)
REM =============================================================================
REM Usage: Double-click start_all.bat or run from CMD
REM Starts V2 Backend, App Flask, and M2 Dashboard in separate windows.
REM =============================================================================

title DSD 2026 - Integration Test Launcher

echo.
echo  ======================================================================
echo    DSD 2026 - Integration Test Launcher
echo    Starting all services for integration testing...
echo  ======================================================================
echo.

REM Get the script directory (handles spaces in path)
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

REM ---- Check runtimes --------------------------------------------------------
echo  [INFO] Checking runtimes...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found! Install from https://nodejs.org
    echo          Requires Node.js 18 or higher.
    pause
    exit /b 1
)

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python not found! Install Python 3.10+
    echo          https://python.org
    pause
    exit /b 1
)

for /f "tokens=1" %%v in ('node --version 2^>^&1') do echo  [OK] Node.js %%v
for /f "tokens=2" %%v in ('python --version 2^>^&1') do echo  [OK] Python %%v
echo.

REM ---- 1. V2 Backend dependencies --------------------------------------------
echo  ---- [1/6] V2 Backend dependencies...
cd /d "%ROOT_DIR%\dsd2026-teamv2"
if not exist node_modules\ (
    echo  Installing V2 Backend dependencies (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] V2 npm install failed!
        pause
        exit /b 1
    )
    echo  V2 Backend dependencies installed.
) else (
    echo  V2 Backend dependencies OK.
)

REM ---- 2. Start V2 Backend ---------------------------------------------------
echo.
echo  ---- [2/6] Starting V2 Backend (port 3000)...
start "V2-Backend-3000" cmd /c "cd /d "%ROOT_DIR%\dsd2026-teamv2" && echo V2 Backend - http://localhost:3000/health && echo. && node src/server.js"

REM Wait for V2 to be ready (try up to 30 seconds)
echo  Waiting for V2 Backend to start...
set TRIES=0
:wait_v2
timeout /t 2 /nobreak >nul
set /a TRIES+=1
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/health' -TimeoutSec 2; if ($r.status -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto v2_ready
if %TRIES% lss 15 goto wait_v2
echo  [WARN] V2 Backend did not respond after 30s. Check the V2-Backend window.
goto skip_v2_wait
:v2_ready
echo  V2 Backend is ready!
:skip_v2_wait
echo.

REM ---- 3. App Python dependencies --------------------------------------------
echo  ---- [3/6] App (Python) dependencies...
cd /d "%ROOT_DIR%\DSD2026-app-windows"
pip show flask >nul 2>&1
if %errorlevel% neq 0 (
    echo  Installing: pip install flask requests
    pip install flask requests
    if %errorlevel% neq 0 (
        echo  [WARN] pip install failed. Try manually: pip install flask requests
    )
)
echo  App dependencies OK.

REM ---- 4. Start App ----------------------------------------------------------
echo.
echo  ---- [4/6] Starting App (port 5000) - Simulator mode, no BLE hardware needed...
start "App-Flask-5000" cmd /c "cd /d "%ROOT_DIR%\DSD2026-app-windows" && echo App Web UI - http://localhost:5000 && echo. && python main.py"

REM ---- 5. M2 dependencies ----------------------------------------------------
echo.
echo  ---- [5/6] M2 Clinical Web dependencies...
cd /d "%ROOT_DIR%\project-main-web\m2-clinical-web"
if not exist node_modules\ (
    echo  Installing M2 Clinical Web dependencies (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] M2 npm install failed!
        pause
        exit /b 1
    )
    echo  M2 Clinical Web dependencies installed.
) else (
    echo  M2 Clinical Web dependencies OK.
)

REM ---- 6. Start M2 -----------------------------------------------------------
echo.
echo  ---- [6/6] Starting M2 Clinical Web (port 5173)...
start "M2-ClinicalWeb-5173" cmd /c "cd /d "%ROOT_DIR%\project-main-web\m2-clinical-web" && echo M2 Dashboard - http://localhost:5173 && echo. && npm run dev"

REM ---- Done ------------------------------------------------------------------
cd /d "%ROOT_DIR%"
echo.
echo  ======================================================================
echo    All services starting!
echo.
echo    V2 Backend:   http://localhost:3000/health
echo    App Web UI:   http://localhost:5000
echo    M2 Dashboard: http://localhost:5173
echo.
echo    [NOTE] Close each cmd window (Ctrl+C) to stop a service.
echo    [NOTE] V1 AI scripts must be run manually from terminal.
echo  ======================================================================
echo.

REM Ask if user wants to open browser
set /p OPEN="Open App Web UI in browser? [Y/n]: "
if /i "%OPEN%" neq "n" (
    start http://localhost:5000
)

echo.
echo  Press any key to exit this launcher (services keep running)...
pause >nul
