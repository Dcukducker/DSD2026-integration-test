@echo off
setlocal enabledelayedexpansion

REM =============================================================================
REM Integration Test - Environment Check (Windows)
REM =============================================================================
REM Usage: Double-click check_env.bat or run from CMD
REM =============================================================================

title DSD 2026 - Environment Check

set PASS=0
set FAIL=0

echo.
echo ======================================================================
echo   DSD 2026 - Integration Test Environment Check
echo   %date% %time%
echo ======================================================================
echo.

REM ---- 1. Runtimes -----------------------------------------------------------
echo ---- 1. Runtimes ---------------------------------------------------------

where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do (
        echo   [PASS] Python %%v
        set /a PASS+=1
    )
) else (
    echo   [FAIL] Python not found! Install from https://python.org
    set /a FAIL+=1
)

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=1" %%v in ('node --version 2^>^&1') do (
        echo   [PASS] Node.js %%v
        set /a PASS+=1
    )
) else (
    echo   [FAIL] Node.js not found! Install from https://nodejs.org
    set /a FAIL+=1
)
echo.

REM ---- 2. Python dependencies ------------------------------------------------
echo ---- 2. Python Dependencies -----------------------------------------------

python -c "import flask" 2>nul
if %errorlevel% equ 0 (
    echo   [PASS] flask
    set /a PASS+=1
) else (
    echo   [WARN] flask not installed - run: pip install flask
)

python -c "import requests" 2>nul
if %errorlevel% equ 0 (
    echo   [PASS] requests
    set /a PASS+=1
) else (
    echo   [WARN] requests not installed - run: pip install requests
)

python -c "import matplotlib" 2>nul
if %errorlevel% equ 0 (
    echo   [PASS] matplotlib
    set /a PASS+=1
) else (
    echo   [WARN] matplotlib not installed - run: pip install matplotlib
)
echo.

REM ---- 3. V2 Backend dependencies --------------------------------------------
echo ---- 3. V2 Backend Dependencies -------------------------------------------

if exist "%~dp0..\dsd2026-teamv2\node_modules\" (
    echo   [PASS] V2 node_modules exists
    set /a PASS+=1
) else (
    echo   [WARN] V2 node_modules not found
    echo          Run: cd dsd2026-teamv2 ^&^& npm install
)
echo.

REM ---- 4. M2 Clinical Web dependencies ---------------------------------------
echo ---- 4. M2 Clinical Web Dependencies --------------------------------------

if exist "%~dp0..\project-main-web\m2-clinical-web\node_modules\" (
    echo   [PASS] M2 node_modules exists
    set /a PASS+=1
) else (
    echo   [WARN] M2 node_modules not found
    echo          Run: cd project-main-web\m2-clinical-web ^&^& npm install
)
echo.

REM ---- 5. Module directories -------------------------------------------------
echo ---- 5. Module Directories ------------------------------------------------

set DIRS=DSD2026-app-windows dsd2026-teamv2 project-main-web v1-motion-standard-curves
for %%d in (%DIRS%) do (
    if exist "%~dp0..\%%d\" (
        echo   [OK] %%d
    ) else (
        echo   [MISSING] %%d
        set /a FAIL+=1
    )
)
echo.

REM ---- 6. Configuration check ------------------------------------------------
echo ---- 6. Configuration Check (should point to localhost) -------------------

set CFG1=%~dp0..\DSD2026-app-windows\src\m1\api_client.py
set CFG2=%~dp0..\v1-motion-standard-curves\generate_recommendation_from_curves.py
set CFG3=%~dp0..\v1-motion-standard-curves\scripts\Walk.py
set CFG4=%~dp0..\v1-motion-standard-curves\scripts\Squat.py
set CFG5=%~dp0..\v1-motion-standard-curves\scripts\Upstairs.py
set CFG6=%~dp0..\project-main-web\m2-clinical-web\src\config\apiConfig.ts

for %%f in ("%CFG1%" "%CFG2%" "%CFG3%" "%CFG4%" "%CFG5%" "%CFG6%") do (
    findstr /c:"localhost" %%f >nul 2>nul
    if !errorlevel! equ 0 (
        echo   [OK] %%~nxf uses localhost
    ) else (
        findstr /c:"113.44.220.94" %%f >nul 2>nul
        if !errorlevel! equ 0 (
            echo   [FAIL] %%~nxf still points to remote server!
            set /a FAIL+=1
        ) else (
            echo   [OK] %%~nxf
        )
    )
)
echo.

REM ---- Summary ---------------------------------------------------------------
echo ======================================================================
echo   Results: %PASS% passed, %FAIL% failed
echo   (WARN = advisory, not a failure)
echo ======================================================================
echo.

if %FAIL% gtr 0 (
    echo [FAIL] Environment check FAILED - fix issues above before testing.
    pause
    exit /b 1
) else (
    echo [PASS] Environment check PASSED - ready for integration testing.
    pause
    exit /b 0
)
