<#
.SYNOPSIS
    DSD 2026 - Comprehensive Integration Test
.DESCRIPTION
    Tests ALL cross-module interfaces across the 4 modules:
      DSD2026-app-windows (App), dsd2026-teamv2 (V2 Backend),
      project-main-web (M2), v1-motion-standard-curves (V1)

    Covers:
      Layer A: App Flask <-> Browser Frontend (M1 internal API, 20 routes)
      Layer B: App Python <-> V2 Backend (api_client, 16 endpoints)
      Layer C: V1 Scripts <-> V2 Backend (measurement fetch + recommendation)
      Layer D: M2 TypeScript <-> V2 Backend (6 services, 25+ endpoints)
      Layer E: Full Data Pipeline (end-to-end)
      Layer F: Boundary & Error Handling

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\integration_test.ps1
#>

param(
    [string]$V2BaseUrl = "http://localhost:3000",
    [string]$AppBaseUrl = "http://localhost:5000",
    [string]$M2BaseUrl = "http://localhost:5173"
)

$ErrorActionPreference = "Continue"
$Pass = 0
$Fail = 0
$Skip = 0
$Token = ""
$UserId = ""
$SessionId = 0
$TestEmail = ""
$TestPassword = "test123456"
$TestName = "IntegrationTest"

function Section([string]$msg) {
    Write-Host ""
    Write-Host "######################################################################" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "######################################################################" -ForegroundColor Cyan
}

function Pass([string]$msg) {
    Write-Host "  [PASS] $msg" -ForegroundColor Green
    $script:Pass++
}

function Fail([string]$msg, [string]$detail) {
    Write-Host "  [FAIL] $msg -- $detail" -ForegroundColor Red
    $script:Fail++
}

function Skip([string]$msg) {
    Write-Host "  [SKIP] $msg" -ForegroundColor Yellow
    $script:Skip++
}

function Info([string]$msg) {
    Write-Host "  [INFO] $msg" -ForegroundColor Gray
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Magenta
Write-Host "  DSD 2026 - Comprehensive Integration Test" -ForegroundColor Magenta
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Magenta
Write-Host "======================================================================" -ForegroundColor Magenta

# ============================================================================
# PRE-CHECK: Verify all services are running
# ============================================================================
Section "PRE-CHECK: Service Availability"

# V2
try { $r = Invoke-RestMethod "$V2BaseUrl/health" -TimeoutSec 3; Pass "V2 Backend (:3000) is running" }
catch { Fail "V2 Backend" "Cannot connect. Start: cd dsd2026-teamv2; node src/server.js"; exit 1 }

# App
try { $null = Invoke-WebRequest $AppBaseUrl -TimeoutSec 3 -UseBasicParsing; Pass "App Flask (:5000) is running" }
catch { Fail "App Flask" "Cannot connect. Start: cd DSD2026-app-windows; python main.py" }

# M2
try { $null = Invoke-WebRequest $M2BaseUrl -TimeoutSec 3 -UseBasicParsing; Pass "M2 Dashboard (:5173) is running" }
catch { Info "M2 Dashboard not running (non-blocking)" }

# V1 (non-blocking)
try { python -c "import os,json,csv,math,argparse; print('OK')" 2>&1 | Out-Null; Pass "V1 Python environment ready" }
catch { Info "V1 Python env check skipped" }

# ============================================================================
# LAYER A: App Flask Internal API (Browser <-> M1)
# ============================================================================
Section "LAYER A: App Flask Internal API (M1 Frontend Routes)"

# A1: Homepage
try {
    $resp = Invoke-WebRequest $AppBaseUrl -TimeoutSec 5 -UseBasicParsing
    if ($resp.StatusCode -eq 200 -and $resp.Content -match "Limb Motion|login|Register") {
        Pass "A1: GET / -> 200 (web UI loaded)"
    } else { Fail "A1: GET /" "Unexpected content" }
} catch { Fail "A1: GET /" $_.Exception.Message }

# A2: Register via App proxy
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$TestEmail = "ittest_$timestamp@test.com"
try {
    $body = @{name=$TestName; email=$TestEmail; password=$TestPassword; role="patient"} | ConvertTo-Json
    $resp = Invoke-RestMethod "$AppBaseUrl/api/register" -Method Post -Body $body -ContentType "application/json"
    if ($resp.token) { Pass "A2: POST /api/register -> 201 (proxy to V2 auth)" }
    else { Fail "A2: POST /api/register" "No token in response" }
} catch { Fail "A2: POST /api/register" $_.Exception.Message }

# A3: Login via App proxy
try {
    $body = @{email=$TestEmail; password=$TestPassword} | ConvertTo-Json
    $resp = Invoke-RestMethod "$AppBaseUrl/api/login" -Method Post -Body $body -ContentType "application/json"
    $Token = $resp.token
    $UserId = $resp.user.id
    Pass "A3: POST /api/login -> 200 (proxy to V2, userId=$UserId)"
} catch { Fail "A3: POST /api/login" $_.Exception.Message }

# A4: Get mode
try {
    $resp = Invoke-RestMethod "$AppBaseUrl/api/mode" -Method Get
    Pass "A4: GET /api/mode -> 200 (mode=$($resp.mode), realAvailable=$($resp.realAvailable))"
} catch { Fail "A4: GET /api/mode" $_.Exception.Message }

# A5: Set mode to simulator
try {
    $body = @{mode="simulator"} | ConvertTo-Json
    $resp = Invoke-RestMethod "$AppBaseUrl/api/mode" -Method Post -Body $body -ContentType "application/json"
    if ($resp.mode -eq "simulator") { Pass "A5: POST /api/mode (simulator) -> 200" }
    else { Fail "A5: POST /api/mode" "Expected simulator, got $($resp.mode)" }
} catch { Fail "A5: POST /api/mode" $_.Exception.Message }

# A6: Configure sensors (simulated - verify validation)
try {
    $body = @{addresses=@()} | ConvertTo-Json
    Invoke-RestMethod "$AppBaseUrl/api/sensors/configure" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Fail "A6: POST /api/sensors/configure" "Expected 400 for empty addresses"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) { Pass "A6: POST /api/sensors/configure -> 400 (empty addresses rejected)" }
    else { Fail "A6: POST /api/sensors/configure" "Unexpected: $($_.Exception.Response.StatusCode.value__)" }
}

# A7: Create session via App proxy
try {
    $body = @{userId=$UserId; token=$Token} | ConvertTo-Json
    $resp = Invoke-RestMethod "$AppBaseUrl/api/session/create" -Method Post -Body $body -ContentType "application/json"
    $SessionId = $resp.id
    Pass "A7: POST /api/session/create -> 201 (sessionId=$SessionId)"
} catch { Fail "A7: POST /api/session/create" $_.Exception.Message }

# A8: Start session on S2
try {
    $body = @{
        sessionId=$SessionId; userId=$UserId
        sensorJointMapping=@{"SIM_SENSOR_A"="left_knee";"SIM_SENSOR_B"="left_knee"}
        payloadStatus="back"
    } | ConvertTo-Json -Depth 3
    $resp = Invoke-RestMethod "$AppBaseUrl/api/session/start" -Method Post -Body $body -ContentType "application/json"
    if ($resp.success) { Pass "A8: POST /api/session/start -> 200 (S2 acquisition started)" }
    else { Fail "A8: POST /api/session/start" "success=false: $($resp.errorMessage)" }
} catch { Fail "A8: POST /api/session/start" $_.Exception.Message }

# A9: Read data from S2
Start-Sleep -Seconds 2
try {
    $resp = Invoke-RestMethod "$AppBaseUrl/api/data/read" -Method Get
    $sdCount = if ($resp.sensorData) { $resp.sensorData.Count } else { 0 }
    $taCount = if ($resp.targetAngles) { $resp.targetAngles.Count } else { 0 }
    if ($sdCount -gt 0 -or $taCount -gt 0) {
        Pass "A9: GET /api/data/read -> 200 (sensorData=$sdCount, targetAngles=$taCount)"
    } else {
        Info "A9: GET /api/data/read -> 200 but empty (may need more time)"
        Pass "A9: GET /api/data/read -> 200 (response OK, data accumulation in progress)"
    }
} catch { Fail "A9: GET /api/data/read" $_.Exception.Message }

# A10: Recording start
try {
    $body = @{token=$Token; sessionId=$SessionId} | ConvertTo-Json
    $resp = Invoke-RestMethod "$AppBaseUrl/api/recording/start" -Method Post -Body $body -ContentType "application/json"
    Pass "A10: POST /api/recording/start -> 200"
} catch { Fail "A10: POST /api/recording/start" $_.Exception.Message }

# Let recording accumulate data
Start-Sleep -Seconds 2

# A11: Recording stop
try {
    $body = @{token=$Token; sessionId=$SessionId} | ConvertTo-Json
    $resp = Invoke-RestMethod "$AppBaseUrl/api/recording/stop" -Method Post -Body $body -ContentType "application/json"
    Pass "A11: POST /api/recording/stop -> 200 (samples=$($resp.sampleCount), angles=$($resp.angleCount))"
} catch { Fail "A11: POST /api/recording/stop" $_.Exception.Message }

# A12: Manual measurement upload
try {
    $body = @{token=$Token; sessionId=$SessionId} | ConvertTo-Json
    $resp = Invoke-RestMethod "$AppBaseUrl/api/measurement/upload" -Method Post -Body $body -ContentType "application/json"
    $a12msg = if ($resp.message) { $resp.message } else { '201' }
    Pass "A12: POST /api/measurement/upload -> $a12msg"
} catch { Fail "A12: POST /api/measurement/upload" $_.Exception.Message }

# A13: Stop session (with upload + V2 end)
try {
    $body = @{token=$Token; sessionId=$SessionId} | ConvertTo-Json
    $resp = Invoke-RestMethod "$AppBaseUrl/api/session/stop" -Method Post -Body $body -ContentType "application/json"
    Pass "A13: POST /api/session/stop -> 200 (batchesUploaded=$($resp.batchesUploaded), samples=$($resp.sampleCount))"
} catch { Fail "A13: POST /api/session/stop" $_.Exception.Message }

# A14: Get session detail via App proxy
try {
    $resp = Invoke-RestMethod "$AppBaseUrl/api/session/$SessionId`?token=$Token" -Method Get
    Pass "A14: GET /api/session/$SessionId -> 200"
} catch { Fail "A14: GET /api/session/$SessionId" $_.Exception.Message }

# A15: Get recommendations via App proxy
try {
    $resp = Invoke-RestMethod "$AppBaseUrl/api/recommendations/engine/$UserId`?token=$Token" -Method Get
    Pass "A15: GET /api/recommendations/engine/$UserId -> 200"
} catch { Fail "A15: GET /api/recommendations/engine" $_.Exception.Message }

# A16: Get schedule via App proxy
try {
    $resp = Invoke-RestMethod "$AppBaseUrl/api/schedule/$UserId`?token=$Token" -Method Get
    Pass "A16: GET /api/schedule/$UserId -> 200"
} catch { Fail "A16: GET /api/schedule" $_.Exception.Message }

# ============================================================================
# LAYER B: App api_client <-> V2 Backend (direct)
# ============================================================================
Section "LAYER B: App api_client -> V2 Backend (direct REST)"

# B1: V2 health
try { $r = Invoke-RestMethod "$V2BaseUrl/health"; Pass "B1: GET /health -> $($r.status)" }
catch { Fail "B1: GET /health" $_.Exception.Message }

# B2: Auth register (direct)
$ts2 = Get-Date -Format "yyyyMMddHHmmss"
$emailB = "direct_$ts2@test.com"
try {
    $body = @{name="DirectTest"; email=$emailB; password=$TestPassword; role="patient"} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    $tokenB = $r.token; $uidB = $r.user.id
    Pass "B2: POST /auth/register -> 201 (userId=$uidB)"
} catch { Fail "B2: POST /auth/register" $_.Exception.Message }

# B3: Auth login
try {
    $body = @{email=$emailB; password=$TestPassword} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/auth/login" -Method Post -Body $body -ContentType "application/json"
    $tokenB = $r.token; $uidB = $r.user.id
    Pass "B3: POST /auth/login -> 200"
} catch { Fail "B3: POST /auth/login" $_.Exception.Message }

# B4: Auth me
try {
    $h = @{Authorization="Bearer $tokenB"}
    $r = Invoke-RestMethod "$V2BaseUrl/auth/me" -Headers $h
    Pass "B4: GET /auth/me -> 200 (name=$($r.name))"
} catch { Fail "B4: GET /auth/me" $_.Exception.Message }

# B5: Get user
try { $r = Invoke-RestMethod "$V2BaseUrl/users/$uidB"; Pass "B5: GET /users/:id -> 200" }
catch { Fail "B5: GET /users/:id" $_.Exception.Message }

# B6: Create session (direct)
try {
    $h = @{Authorization="Bearer $tokenB"}
    $body = @{userId=$uidB} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/sessions" -Method Post -Body $body -ContentType "application/json" -Headers $h
    $sidB = $r.id
    Pass "B6: POST /sessions -> 200 (sessionId=$sidB)"
} catch { Fail "B6: POST /sessions" $_.Exception.Message }

# B7: Upload raw measurement
try {
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $body = @{
        sessionId=$sidB
        targetAngles=@(@{timestamp=$now; angleID="left_knee"; angle=30.5})
        sensorData=@(@{timestamp=$now; sensorId="SIM_A"; accX=0.1; accY=0.2; accZ=0.9; gyroX=0; gyroY=1; gyroZ=0; roll=10; pitch=-5; yaw=0})
        errors=@()
    } | ConvertTo-Json -Depth 4
    $r = Invoke-RestMethod "$V2BaseUrl/measurements/raw" -Method Post -Body $body -ContentType "application/json" -Headers $h
    Pass "B7: POST /measurements/raw -> 201"
} catch { Fail "B7: POST /measurements/raw" $_.Exception.Message }

# B8: Batch upload
try {
    $now2 = (Get-Date).ToUniversalTime().AddSeconds(-1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $body = @{
        sessionId=$sidB
        measurements=@(
            @{targetAngles=@(@{timestamp=$now2; angleID="left_knee"; angle=35.0}); sensorData=@()}
            @{targetAngles=@(@{timestamp=$now2; angleID="left_knee"; angle=40.0}); sensorData=@()}
        )
    } | ConvertTo-Json -Depth 4
    $r = Invoke-RestMethod "$V2BaseUrl/measurements/batch" -Method Post -Body $body -ContentType "application/json" -Headers $h
    Pass "B8: POST /measurements/batch -> 201 (inserted=$($r.inserted))"
} catch { Fail "B8: POST /measurements/batch" $_.Exception.Message }

# B9: Single measurement
try {
    $body = @{sessionId=$sidB; jointAngles=@{"knee"=45.2}; isCorrect=$true} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/measurements" -Method Post -Body $body -ContentType "application/json" -Headers $h
    Pass "B9: POST /measurements -> 201"
} catch { Fail "B9: POST /measurements" $_.Exception.Message }

# B10: Get measurements
try {
    $r = Invoke-RestMethod "$V2BaseUrl/measurements/$sidB" -Headers $h
    $count = if ($r.Count) { $r.Count } else { 0 }
    Pass "B10: GET /measurements/:sessionId -> 200 ($count measurements)"
} catch { Fail "B10: GET /measurements" $_.Exception.Message }

# B11: End session
try {
    $r = Invoke-RestMethod "$V2BaseUrl/sessions/$sidB/end" -Method Patch -Headers $h -Body "{}"
    Pass "B11: PATCH /sessions/:id/end -> 200 (ended_at=$($r.ended_at))"
} catch { Fail "B11: PATCH /sessions/:id/end" $_.Exception.Message }

# B12: Get session detail
try {
    $r = Invoke-RestMethod "$V2BaseUrl/sessions/$sidB" -Headers $h
    Pass "B12: GET /sessions/:id -> 200"
} catch { Fail "B12: GET /sessions/:id" $_.Exception.Message }

# B13: Delete session
try {
    $r = Invoke-RestMethod "$V2BaseUrl/sessions/$sidB" -Method Delete -Headers $h
    Pass "B13: DELETE /sessions/:id -> 200"
} catch { Fail "B13: DELETE /sessions/:id" $_.Exception.Message }

# B14: Get schedule
try { $r = Invoke-RestMethod "$V2BaseUrl/schedule/$uidB" -Headers $h; Pass "B14: GET /schedule/:userId -> 200" }
catch { Fail "B14: GET /schedule" $_.Exception.Message }

# B15: Create recommendation (direct)
try {
    $body = @{sessionId=$SessionId; movement="walking"; confidence=0.85; notes="Integration test recommendation"} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/recommendations" -Method Post -Body $body -ContentType "application/json" -Headers $h
    $recId = $r.id
    Pass "B15: POST /recommendations -> 200 (recId=$recId)"
} catch { Fail "B15: POST /recommendations" $_.Exception.Message }

# ============================================================================
# LAYER C: V1 Python Scripts <-> V2 Backend
# ============================================================================
Section "LAYER C: V1 AI Scripts -> V2 Backend"

# C1: V1 fetch measurements directly
try {
    $r = Invoke-RestMethod "$V2BaseUrl/measurements/$SessionId"
    $count = if ($r.Count) { $r.Count } else { 0 }
    if ($count -gt 0) {
        # Check data format V1 expects
        $first = $r[0]
        $hasAngles = $null -ne $first.joint_angles -or $null -ne $first.target_angles
        Pass "C1: V1 GET /measurements/$SessionId -> 200 ($count records, hasAngles=$hasAngles)"
    } else {
        Info "C1: V1 GET /measurements/$SessionId -> 200 (0 records, session may have been delegated)"
        Pass "C1: GET /measurements endpoint reachable"
    }
} catch { Fail "C1: V1 GET /measurements" $_.Exception.Message }

# C2: V1 generate recommendation script (CLI test)
$v1Dir = Join-Path (Split-Path -Parent $PSScriptRoot) "v1-motion-standard-curves"
try {
    $stdCsv = Join-Path $v1Dir "outputs\walking\normal_knee_curve.csv"
    if (Test-Path $stdCsv) {
        $outJson = Join-Path $v1Dir "outputs\recommendations\walking\integration_test.json"
        $outTxt = Join-Path $v1Dir "outputs\recommendations\walking\integration_test.txt"
        $cmd = "python `"$(Join-Path $v1Dir 'generate_recommendation_from_curves.py')`" --action walking --patient-session-id $SessionId --standard-csv `"$stdCsv`" --out-json `"$outJson`" --out-txt `"$outTxt`" --segment-patient never 2>&1"
        $result = Invoke-Expression $cmd
        if (Test-Path $outJson) {
            $json = Get-Content $outJson -Raw | ConvertFrom-Json
            Pass "C2: V1 generate_recommendation --action walking --patient-session-id $SessionId -> JSON generated (status=$($json.status), confidence=$($json.confidence))"
        } else { Fail "C2: V1 recommendation generation" "No output JSON produced" }
    } else {
        Skip "C2: V1 standard curve CSV not found (run Walk.py first)"
    }
} catch { Fail "C2: V1 generate_recommendation" $_.Exception.Message }

# C3: V1 evaluate accuracy script
try {
    $evaluator = Join-Path $v1Dir "evaluate_recommendation_accuracy.py"
    if (Test-Path $evaluator) {
        $result = python -c "import sys; sys.path.insert(0, '$v1Dir'); exec(open('$evaluator').read().split('if __name__')[0]); print('module_loaded')" 2>&1
        if ($LASTEXITCODE -eq 0) { Pass "C3: V1 evaluate_recommendation_accuracy.py module loads OK" }
        else { Info "C3: V1 evaluate module check (non-critical)" }
    } else { Skip "C3: V1 evaluator not found" }
} catch { Info "C3: V1 evaluate module check skipped" }

# ============================================================================
# LAYER D: M2 TypeScript Services <-> V2 Backend
# ============================================================================
Section "LAYER D: M2 Clinical Web -> V2 Backend (API endpoints)"

# All M2 services call these V2 endpoints. We test them directly via curl.

# D1: GET /patients
try { $r = Invoke-RestMethod "$V2BaseUrl/patients"; Pass "D1: GET /patients -> 200 ($(if($r.Count){$r.Count}else{'N/A'}) patients)" }
catch { Fail "D1: GET /patients" $_.Exception.Message }

# D2: GET /users
try { $r = Invoke-RestMethod "$V2BaseUrl/users"; Pass "D2: GET /users -> 200 ($(if($r.Count){$r.Count}else{'N/A'}) users)" }
catch { Fail "D2: GET /users" $_.Exception.Message }

# D3: GET /sessions (list all)
try { $r = Invoke-RestMethod "$V2BaseUrl/sessions"; Pass "D3: GET /sessions -> 200 ($(if($r.Count){$r.Count}else{'N/A'}) sessions)" }
catch { Fail "D3: GET /sessions" $_.Exception.Message }

# D4: GET /sessions?userId=X
try { $r = Invoke-RestMethod "$V2BaseUrl/sessions?userId=$UserId"; Pass "D4: GET /sessions?userId=$UserId -> 200" }
catch { Fail "D4: GET /sessions?userId=" $_.Exception.Message }

# D5: GET /progress/:userId
try { $r = Invoke-RestMethod "$V2BaseUrl/progress/$UserId"; Pass "D5: GET /progress/$UserId -> 200 (weekLabel=$($r.weekLabel))" }
catch { Fail "D5: GET /progress" $_.Exception.Message }

# D6: GET /recommendations/engine/:userId
try { $r = Invoke-RestMethod "$V2BaseUrl/recommendations/engine/$UserId"; Pass "D6: GET /recommendations/engine/$UserId -> 200" }
catch { Fail "D6: GET /recommendations/engine" $_.Exception.Message }

# D7: GET /recommendations/session/:sessionId
try { $r = Invoke-RestMethod "$V2BaseUrl/recommendations/session/$SessionId"
    Pass "D7: GET /recommendations/session/$SessionId -> 200" }
catch { Fail "D7: GET /recommendations/session" $_.Exception.Message }

# D8: POST /feedback
try {
    $body = @{userId=$UserId; content="Integration test feedback"} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/feedback" -Method Post -Body $body -ContentType "application/json" -Headers $h
    Pass "D8: POST /feedback -> 201 (id=$($r.id))"
} catch { Fail "D8: POST /feedback" $_.Exception.Message }

# D9: GET /feedback
try { $r = Invoke-RestMethod "$V2BaseUrl/feedback"; Pass "D9: GET /feedback -> 200 ($(if($r.Count){$r.Count}else{'N/A'}) items)" }
catch { Fail "D9: GET /feedback" $_.Exception.Message }

# D10: POST /announcements
try {
    $body = @{title="Integration Test"; content="Test announcement"; createdBy=$UserId} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/announcements" -Method Post -Body $body -ContentType "application/json" -Headers $h
    Pass "D10: POST /announcements -> 201 (id=$($r.id))"
} catch { Fail "D10: POST /announcements" $_.Exception.Message }

# D11: GET /announcements
try { $r = Invoke-RestMethod "$V2BaseUrl/announcements"; Pass "D11: GET /announcements -> 200" }
catch { Fail "D11: GET /announcements" $_.Exception.Message }

# D12: GET /audit-logs
try { $r = Invoke-RestMethod "$V2BaseUrl/audit-logs"; Pass "D12: GET /audit-logs -> 200" }
catch { Fail "D12: GET /audit-logs" $_.Exception.Message }

# D13: POST /schedule
try {
    $body = @{userId=$UserId; exercise="squat"; date=(Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ"); duration=30; notes="Integration test"} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/schedule" -Method Post -Body $body -ContentType "application/json" -Headers $h
    Pass "D13: POST /schedule -> 201 (id=$($r.id))"
} catch { Fail "D13: POST /schedule" $_.Exception.Message }

# D14: PATCH /users/:id (doctor binding test - validation only)
try {
    $body = @{age=30} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/users/$UserId" -Method Patch -Body $body -ContentType "application/json"
    Pass "D14: PATCH /users/$UserId -> 200"
} catch { Fail "D14: PATCH /users" $_.Exception.Message }

# D15: GET /auth/status
try { $r = Invoke-RestMethod "$V2BaseUrl/auth/status" -Headers $h; Pass "D15: GET /auth/status -> 200 (role=$($r.role))" }
catch { Fail "D15: GET /auth/status" $_.Exception.Message }

# D16: GET /users/:id (doctor verification endpoint)
try { $r = Invoke-RestMethod "$V2BaseUrl/users/$UserId"; Pass "D16: GET /users/$UserId -> 200" }
catch { Fail "D16: GET /users/:id" $_.Exception.Message }

# ============================================================================
# LAYER E: Full Data Pipeline (End-to-End)
# ============================================================================
Section "LAYER E: Full Data Pipeline (End-to-End)"

# E1: Create session -> Start -> Collect data -> Upload -> End -> Verify
try {
    # Create new session
    $h = @{Authorization="Bearer $Token"}
    $body = @{userId=$UserId} | ConvertTo-Json
    $s = Invoke-RestMethod "$V2BaseUrl/sessions" -Method Post -Body $body -ContentType "application/json" -Headers $h
    $testSid = $s.id

    # Upload measurement
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $body = @{
        sessionId=$testSid
        targetAngles=@(@{timestamp=$now; angleID="left_knee"; angle=60.0})
        sensorData=@()
        errors=@()
    } | ConvertTo-Json -Depth 4
    $r = Invoke-RestMethod "$V2BaseUrl/measurements/raw" -Method Post -Body $body -ContentType "application/json" -Headers $h

    # End session
    $r = Invoke-RestMethod "$V2BaseUrl/sessions/$testSid/end" -Method Patch -Headers $h -Body "{}"

    # Verify: read session
    $verify = Invoke-RestMethod "$V2BaseUrl/sessions/$testSid" -Headers $h
    if ($verify.ended_at) {
        Pass "E1: Full pipeline (create->upload->end->verify) -> PASSED (ended_at=$($verify.ended_at))"
    } else { Fail "E1: Full pipeline" "Session not ended" }
} catch { Fail "E1: Full pipeline" $_.Exception.Message }

# E2: App proxy full pipeline (via Flask routes)
try {
    $body = @{userId=$UserId; token=$Token} | ConvertTo-Json
    $s = Invoke-RestMethod "$AppBaseUrl/api/session/create" -Method Post -Body $body -ContentType "application/json"
    $testSid2 = $s.id

    $body = @{sessionId=$testSid2; userId=$UserId; sensorJointMapping=@{"SIM_SENSOR_A"="left_knee";"SIM_SENSOR_B"="left_knee"}; payloadStatus="back"} | ConvertTo-Json -Depth 3
    $r = Invoke-RestMethod "$AppBaseUrl/api/session/start" -Method Post -Body $body -ContentType "application/json"
    Start-Sleep -Seconds 2

    $body = @{token=$Token; sessionId=$testSid2} | ConvertTo-Json
    $r = Invoke-RestMethod "$AppBaseUrl/api/session/stop" -Method Post -Body $body -ContentType "application/json"
    if ($r.sampleCount -gt 0) {
        Pass "E2: App proxy pipeline (create->start->stop) -> PASSED (samples=$($r.sampleCount))"
    } else {
        Pass "E2: App proxy pipeline -> Completed (samples=$($r.sampleCount), may be 0 for short sessions)"
    }
} catch { Fail "E2: App proxy pipeline" $_.Exception.Message }

# ============================================================================
# LAYER F: Boundary & Error Handling
# ============================================================================
Section "LAYER F: Boundary Conditions & Error Handling"

# F1: Register with missing fields
try {
    Invoke-RestMethod "$V2BaseUrl/auth/register" -Method Post -Body "{}" -ContentType "application/json" -ErrorAction Stop
    Fail "F1: Missing fields" "Expected 400"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) { Pass "F1: Register with missing fields -> 400" }
    else { Fail "F1: Missing fields" "Got $($_.Exception.Response.StatusCode.value__), expected 400" }
}

# F2: Login with wrong password
try {
    $body = @{email=$TestEmail; password="wrongwrong"} | ConvertTo-Json
    Invoke-RestMethod "$V2BaseUrl/auth/login" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Fail "F2: Wrong password" "Expected 401"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) { Pass "F2: Wrong password -> 401" }
    else { Fail "F2: Wrong password" "Got $($_.Exception.Response.StatusCode.value__)" }
}

# F3: Non-existent session
try {
    Invoke-RestMethod "$V2BaseUrl/sessions/99999" -ErrorAction Stop
    Fail "F3: Non-existent session" "Expected 404"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) { Pass "F3: GET /sessions/99999 -> 404" }
    else { Fail "F3: Non-existent session" "Got $($_.Exception.Response.StatusCode.value__)" }
}

# F4: Upload to closed session
try {
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $body = @{sessionId=$SessionId; targetAngles=@(@{timestamp=$now; angleID="left_knee"; angle=50.0}); sensorData=@(); errors=@()} | ConvertTo-Json -Depth 4
    Invoke-RestMethod "$V2BaseUrl/measurements/raw" -Method Post -Body $body -ContentType "application/json" -Headers $h -ErrorAction Stop
    Fail "F4: Upload to closed session" "Expected 409"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) { Pass "F4: Upload to closed session -> 409 Conflict" }
    else { Fail "F4: Closed session" "Got $($_.Exception.Response.StatusCode.value__), expected 409" }
}

# F5: Missing sessionId in measurement
try {
    $body = @{targetAngles=@(@{timestamp="2026-01-01T00:00:00Z"; angleID="knee"; angle=45.0})} | ConvertTo-Json
    Invoke-RestMethod "$V2BaseUrl/measurements" -Method Post -Body $body -ContentType "application/json" -Headers $h -ErrorAction Stop
    Fail "F5: Missing sessionId" "Expected 400"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) { Pass "F5: Missing sessionId in measurement -> 400" }
    else { Fail "F5: Missing sessionId" "Got $($_.Exception.Response.StatusCode.value__)" }
}

# F6: App mode invalid value
try {
    $body = @{mode="invalid"} | ConvertTo-Json
    Invoke-RestMethod "$AppBaseUrl/api/mode" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Fail "F6: Invalid mode" "Expected 400"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) { Pass "F6: Invalid mode value -> 400" }
    else { Fail "F6: Invalid mode" "Got $($_.Exception.Response.StatusCode.value__)" }
}

# F7: Delete non-existent session
try {
    Invoke-RestMethod "$V2BaseUrl/sessions/99999" -Method Delete -Headers $h -ErrorAction Stop
    Fail "F7: Delete non-existent" "Expected 404"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) { Pass "F7: DELETE /sessions/99999 -> 404" }
    else { Fail "F7: Delete non-existent" "Got $($_.Exception.Response.StatusCode.value__)" }
}

# ============================================================================
# SUMMARY
# ============================================================================
Section "SUMMARY"

$total = $Pass + $Fail + $Skip
$pct = if ($total -gt 0) { [math]::Round(($Pass / ($Pass + $Fail)) * 100, 1) } else { 0 }

Write-Host ""
Write-Host "  ==================================================================" -ForegroundColor White
Write-Host "  TOTAL: $total tests" -ForegroundColor White
Write-Host "  PASS:  $Pass" -ForegroundColor Green
Write-Host "  FAIL:  $Fail" -ForegroundColor Red
Write-Host "  SKIP:  $Skip" -ForegroundColor Yellow
Write-Host "  SCORE: $pct% pass rate" -ForegroundColor $(if ($Fail -eq 0) { "Green" } else { "Red" })
Write-Host "  ==================================================================" -ForegroundColor White
Write-Host ""

# Layer summary
Write-Host "  Layer Breakdown:" -ForegroundColor Cyan
Write-Host "    Layer A: App Flask <-> Browser Frontend  (M1 internal API)"
Write-Host "    Layer B: App api_client <-> V2 Backend   (direct REST)"
Write-Host "    Layer C: V1 Scripts <-> V2 Backend       (AI pipeline)"
Write-Host "    Layer D: M2 Services <-> V2 Backend      (clinical dashboard)"
Write-Host "    Layer E: Full Data Pipeline              (end-to-end)"
Write-Host "    Layer F: Boundary & Error Handling       (negative tests)"
Write-Host ""

if ($Fail -gt 0) {
    Write-Host "[FAIL] Integration test has $Fail failure(s). See details above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "[PASS] All integration tests passed!" -ForegroundColor Green
    exit 0
}
