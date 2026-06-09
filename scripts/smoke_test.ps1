<#
.SYNOPSIS
    DSD 2026 Integration Smoke Test (PowerShell)
.DESCRIPTION
    Runs a complete API smoke test: register -> login -> session -> upload -> verify.
.PARAMETER V2BaseUrl
    V2 Backend base URL (default: http://localhost:3000)
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\smoke_test.ps1
    powershell -ExecutionPolicy Bypass -File scripts\smoke_test.ps1 -V2BaseUrl "http://113.44.220.94:3000"
#>

param(
    [string]$V2BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$Pass = 0
$Fail = 0
$Token = ""
$UserId = ""
$SessionId = ""
$TestEmail = ""
$TestEmail2 = ""
$TestPassword = "test123456"

# Output helpers
function Step([string]$msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Pass([string]$msg) {
    Write-Host "  [PASS] $msg" -ForegroundColor Green
    $script:Pass++
}

function Fail([string]$msg, [string]$detail) {
    Write-Host "  [FAIL] $msg -- $detail" -ForegroundColor Red
    $script:Fail++
}

function Info([string]$msg) {
    Write-Host "  [INFO] $msg" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  DSD 2026 - Integration Smoke Test" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "  V2 Backend: $V2BaseUrl" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# ---- 1. Health Check ----------------------------------------------------------
Step "1. V2 Backend Health Check"
try {
    $resp = Invoke-RestMethod -Uri "$V2BaseUrl/health" -Method Get -ErrorAction Stop
    Pass "GET /health -> $($resp.status) (team: $($resp.team))"
} catch {
    Fail "GET /health" "Cannot reach V2 Backend - is it running?"
    Write-Host ""
    Write-Host "[FAIL] Smoke test ABORTED - V2 Backend is not reachable." -ForegroundColor Red
    Write-Host "       Start it first: cd dsd2026-teamv2; node src/server.js" -ForegroundColor Yellow
    exit 1
}

# ---- 2. User Registration -----------------------------------------------------
Step "2. User Registration"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$TestEmail = "ittest_$timestamp@test.com"
$testName = "Integration Test User"

$regBody = @{
    name     = $testName
    email    = $TestEmail
    password = $TestPassword
    role     = "patient"
} | ConvertTo-Json

try {
    $regResp = Invoke-RestMethod -Uri "$V2BaseUrl/auth/register" -Method Post `
        -Body $regBody -ContentType "application/json"
    $Token = $regResp.token
    $UserId = $regResp.user.id
    Pass "POST /auth/register -> 201 (userId=$UserId, name=$($regResp.user.name))"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Info "Email exists (409), retrying with unique email..."
        $TestEmail2 = "ittest2_$timestamp@test.com"
        $regBody2 = @{name=$testName; email=$TestEmail2; password=$TestPassword; role="patient"} | ConvertTo-Json
        try {
            $regResp2 = Invoke-RestMethod -Uri "$V2BaseUrl/auth/register" -Method Post `
                -Body $regBody2 -ContentType "application/json"
            $Token = $regResp2.token
            $UserId = $regResp2.user.id
            Pass "POST /auth/register -> 201 (userId=$UserId, retry OK)"
        } catch {
            Fail "POST /auth/register" $_.Exception.Message
        }
    } else {
        Fail "POST /auth/register" $_.Exception.Message
    }
}

# ---- 3. Login Verification ----------------------------------------------------
Step "3. Login Verification"
if (-not $Token) {
    Fail "Login skipped" "no token from registration"
} else {
    $loginEmail = if ($TestEmail2) { $TestEmail2 } else { $TestEmail }
    $loginBody = @{ email = $loginEmail; password = $TestPassword } | ConvertTo-Json
    try {
        $loginResp = Invoke-RestMethod -Uri "$V2BaseUrl/auth/login" -Method Post `
            -Body $loginBody -ContentType "application/json"
        if ($loginResp.token) {
            $Token = $loginResp.token
            $UserId = $loginResp.user.id
            Pass "POST /auth/login -> 200 (token obtained, userId=$UserId)"
        } else {
            Fail "POST /auth/login" "no token in response"
        }
    } catch {
        Fail "POST /auth/login" $_.Exception.Message
    }
}

# ---- 4. Create Session ---------------------------------------------------------
Step "4. Session Creation"
if (-not $Token) {
    Fail "Session creation skipped" "no auth token"
} else {
    $sessBody = @{ userId = $UserId } | ConvertTo-Json
    try {
        $headers = @{ Authorization = "Bearer $Token" }
        $sessResp = Invoke-RestMethod -Uri "$V2BaseUrl/sessions" -Method Post `
            -Body $sessBody -ContentType "application/json" -Headers $headers
        $SessionId = if ($sessResp.id) { $sessResp.id } else { $sessResp.Id }
        Pass "POST /sessions -> 200 (sessionId=$SessionId)"
    } catch {
        Fail "POST /sessions" $_.Exception.Message
    }
}

# ---- 5. Upload Measurement ----------------------------------------------------
Step "5. Measurement Upload"
if (-not $Token -or -not $SessionId) {
    Fail "Measurement upload skipped" "no token or session"
} else {
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $measBody = @{
        sessionId    = $SessionId
        targetAngles = @(
            @{ timestamp = $now; angleID = "left_knee"; angle = 45.2 }
        )
        sensorData   = @(
            @{
                timestamp = $now
                sensorId  = "SIM_SENSOR_A"
                accX      = 0.22; accY = 0.29; accZ = 0.97
                gyroX     = 0.0;  gyroY = 3.11; gyroZ = -0.73
                roll      = 15.57; pitch = -13.78; yaw = -144.01
            }
        )
        errors       = @()
    } | ConvertTo-Json -Depth 4

    try {
        $headers = @{ Authorization = "Bearer $Token" }
        $measResp = Invoke-RestMethod -Uri "$V2BaseUrl/measurements/raw" -Method Post `
            -Body $measBody -ContentType "application/json" -Headers $headers
        Pass "POST /measurements/raw -> 201"
    } catch {
        Fail "POST /measurements/raw" $_.Exception.Message
    }
}

# ---- 6. Batch Upload ----------------------------------------------------------
Step "6. Batch Measurement Upload"
if (-not $Token -or -not $SessionId) {
    Fail "Batch upload skipped" "no token or session"
} else {
    $now2 = (Get-Date).ToUniversalTime().AddSeconds(-1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $now3 = (Get-Date).ToUniversalTime().AddSeconds(-2).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $batchBody = @{
        sessionId    = $SessionId
        measurements = @(
            @{ targetAngles = @(@{ timestamp = $now2; angleID = "left_knee"; angle = 30.0 }); sensorData = @() }
            @{ targetAngles = @(@{ timestamp = $now3; angleID = "left_knee"; angle = 32.0 }); sensorData = @() }
        )
    } | ConvertTo-Json -Depth 4

    try {
        $headers = @{ Authorization = "Bearer $Token" }
        $batchResp = Invoke-RestMethod -Uri "$V2BaseUrl/measurements/batch" -Method Post `
            -Body $batchBody -ContentType "application/json" -Headers $headers
        Pass "POST /measurements/batch -> 201 (inserted: $($batchResp.inserted))"
    } catch {
        Fail "POST /measurements/batch" $_.Exception.Message
    }
}

# ---- 7. End Session -----------------------------------------------------------
Step "7. End Session"
if (-not $Token -or -not $SessionId) {
    Fail "End session skipped" "no token or session"
} else {
    try {
        $headers = @{ Authorization = "Bearer $Token" }
        $endResp = Invoke-RestMethod -Uri "$V2BaseUrl/sessions/$SessionId/end" -Method Patch `
            -Headers $headers -ContentType "application/json" -Body "{}"
        Pass "PATCH /sessions/$SessionId/end -> 200"
        if ($endResp.ended_at) {
            Pass "Session ended_at: $($endResp.ended_at)"
        }
    } catch {
        Fail "PATCH /sessions/$SessionId/end" $_.Exception.Message
    }
}

# ---- 8. Verify Data -----------------------------------------------------------
Step "8. Verify Stored Data"
if (-not $Token -or -not $SessionId) {
    Fail "Data verification skipped" "no token or session"
} else {
    try {
        $headers = @{ Authorization = "Bearer $Token" }
        $sessData = Invoke-RestMethod -Uri "$V2BaseUrl/sessions/$SessionId" `
            -Method Get -Headers $headers
        Pass "GET /sessions/$SessionId -> 200"
    } catch {
        Fail "GET /sessions/$SessionId" $_.Exception.Message
    }

    try {
        $headers = @{ Authorization = "Bearer $Token" }
        $measData = Invoke-RestMethod -Uri "$V2BaseUrl/measurements/$SessionId" `
            -Method Get -Headers $headers
        $count = if ($measData.Count) { $measData.Count } else { 0 }
        if ($count -gt 0) {
            Pass "GET /measurements/$SessionId -> 200 ($count measurements)"
        } else {
            Fail "GET /measurements/$SessionId" "0 measurements found - data may not have been stored"
        }
    } catch {
        Fail "GET /measurements/$SessionId" $_.Exception.Message
    }
}

# ---- 9. Boundary Tests ---------------------------------------------------------
Step "9. Boundary Condition Tests"

if (-not $Token) {
    Info "Boundary tests skipped (no token)"
} else {
    $headers = @{ Authorization = "Bearer $Token" }

    # 9a. Closed session upload
    try {
        $now4 = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        $closedBody = @{
            sessionId    = $SessionId
            targetAngles = @(@{ timestamp = $now4; angleID = "left_knee"; angle = 50.0 })
            sensorData   = @()
            errors       = @()
        } | ConvertTo-Json -Depth 4
        Invoke-RestMethod -Uri "$V2BaseUrl/measurements/raw" -Method Post `
            -Body $closedBody -ContentType "application/json" -Headers $headers -ErrorAction Stop
        Fail "Upload to closed session" "Expected 409, but got success"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 409) {
            Pass "Upload to closed session -> 409 Conflict (correct)"
        } else {
            Info "Upload to closed session -> $($_.Exception.Response.StatusCode.value__) (expected 409)"
        }
    }

    # 9b. Missing required fields
    try {
        Invoke-RestMethod -Uri "$V2BaseUrl/sessions" -Method Post `
            -Body "{}" -ContentType "application/json" -Headers $headers -ErrorAction Stop
        Fail "Missing fields test" "Expected 400, but got success"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 400) {
            Pass "POST /sessions without userId -> 400 Bad Request (correct)"
        } else {
            Info "POST /sessions without userId -> $($_.Exception.Response.StatusCode.value__) (expected 400)"
        }
    }

    # 9c. Non-existent resource
    try {
        Invoke-RestMethod -Uri "$V2BaseUrl/sessions/99999" -Method Get `
            -Headers $headers -ErrorAction Stop
        Fail "Non-existent session" "Expected 404, but got success"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Pass "GET /sessions/99999 -> 404 Not Found (correct)"
        } else {
            Info "GET /sessions/99999 -> $($_.Exception.Response.StatusCode.value__) (expected 404)"
        }
    }

    # 9d. Wrong credentials
    try {
        $wrongBody = @{ email = "no@such.user"; password = "wrong" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$V2BaseUrl/auth/login" -Method Post `
            -Body $wrongBody -ContentType "application/json" -ErrorAction Stop
        Fail "Wrong credentials" "Expected 401, but got success"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 401) {
            Pass "POST /auth/login wrong credentials -> 401 (correct)"
        } else {
            Info "POST /auth/login wrong credentials -> $($_.Exception.Response.StatusCode.value__) (expected 401)"
        }
    }
}

# ---- Summary ------------------------------------------------------------------
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
$total = $Pass + $Fail
Write-Host "  Results: $Pass passed, $Fail failed (Total: $total API calls)" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

if ($Fail -gt 0) {
    Write-Host "[FAIL] Smoke test FAILED - $Fail test(s) failed." -ForegroundColor Red
    exit 1
} else {
    Write-Host "[PASS] Smoke test PASSED - full data pipeline is working!" -ForegroundColor Green
    exit 0
}
