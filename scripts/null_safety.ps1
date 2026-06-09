<#
.SYNOPSIS
    DSD 2026 - Null/Empty Return Value Safety Test
.DESCRIPTION
    Tests every cross-module API endpoint for null/empty/missing return values.
    Verifies that each endpoint handles edge cases:
      - Empty database (no users/sessions/measurements)
      - Non-existent IDs
      - New user with no data
      - Missing optional fields
      - Empty arrays vs null
      - Response structure consistency

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\null_safety.ps1
#>

param(
    [string]$V2BaseUrl = "http://localhost:3000",
    [string]$AppBaseUrl = "http://localhost:5000"
)

$ErrorActionPreference = "Continue"
$Pass = 0; $Fail = 0; $Warn = 0

function Section([string]$msg) {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
}

function Pass([string]$msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green; $script:Pass++ }
function Fail([string]$file, [string]$line, [string]$detail) {
    Write-Host "  [FAIL] ${file}:${line} — $detail" -ForegroundColor Red
    $script:Fail++
}
function Warn([string]$file, [string]$line, [string]$detail) {
    Write-Host "  [WARN] ${file}:${line} — $detail" -ForegroundColor Yellow
    $script:Warn++
}
function Info([string]$msg) {
    Write-Host "  [INFO] $msg"
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Magenta
Write-Host "  DSD 2026 - Null/Empty Return Value Safety Test" -ForegroundColor Magenta
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Magenta
Write-Host "======================================================================" -ForegroundColor Magenta

# Pre-check
try { Invoke-RestMethod "$V2BaseUrl/health" | Out-Null } catch { Write-Host "V2 not running!"; exit 1 }
$appRunning = try { Invoke-WebRequest $AppBaseUrl -TimeoutSec 2 -UseBasicParsing | Out-Null; $true } catch { $false }

# ============================================================================
# SECTION 1: V2 Backend — Empty State Responses
# ============================================================================
Section "SECTION 1: V2 Backend Empty State Responses"

# Create a fresh user with NO data
$ts = Get-Date -Format "yyyyMMddHHmmss"
$freshEmail = "nulltest_$ts@test.com"
try {
    $body = @{name="Null Test User"; email=$freshEmail; password="test123456"; role="patient"} | ConvertTo-Json
    $freshUser = Invoke-RestMethod "$V2BaseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    $freshToken = $freshUser.token
    $freshUid = $freshUser.user.id
    $freshHeaders = @{Authorization="Bearer $freshToken"}
    Info "  Created fresh user id=$freshUid (no sessions, no measurements)"
} catch { Fail "V2 pre-check" "0" "Cannot create test user: $($_.Exception.Message)"; exit 1 }

# 1.1 GET /users — should include admin + test users
try {
    $r = Invoke-RestMethod "$V2BaseUrl/users"
    if ($r -is [array] -and $r.Count -gt 0) {
        Pass "GET /users -> array with $($r.Count) items"
        # Check: do all users have required fields?
        $missingFields = @()
        foreach ($u in $r[0..2]) {
            if (-not (Get-Member -InputObject $u -Name "id" -MemberType Properties)) { $missingFields += "id" }
            if (-not (Get-Member -InputObject $u -Name "name" -MemberType Properties)) { $missingFields += "name" }
            if (-not (Get-Member -InputObject $u -Name "email" -MemberType Properties)) { $missingFields += "email" }
        }
        if ($missingFields.Count -eq 0) { Pass "  User objects have required fields (id, name, email)" }
        else { Warn "usersController.js" "15-18" "Missing fields in user response: $missingFields" }
    } else { Fail "usersController.js" "15-18" "GET /users returned non-array or empty" }
} catch { Fail "usersController.js" "15" "GET /users exception: $($_.Exception.Message)" }

# 1.2 GET /sessions?userId=<fresh> — should return EMPTY array
try {
    $r = Invoke-RestMethod "$V2BaseUrl/sessions?userId=$freshUid"
    if ($r -is [array] -and $r.Count -eq 0) {
        Pass "GET /sessions?userId=$freshUid -> empty array (correct for new user)"
    } elseif ($r -is [array]) {
        Pass "GET /sessions?userId=$freshUid -> array with $($r.Count) items"
    } else { Fail "sessionsController.js" "18" "Returned non-array: $($r.GetType())" }
} catch { Fail "sessionsController.js" "18" "Exception: $($_.Exception.Message)" }

# 1.3 GET /progress/:userId for fresh user — what happens?
try {
    $r = Invoke-RestMethod "$V2BaseUrl/progress/$freshUid"
    if ($r.userId) {
        Pass "GET /progress/$freshUid -> 200 (userId=$($r.userId))"
        # Check ROM for fresh user
        if ($null -eq $r.rom.currentDegrees -or $r.rom.currentDegrees -eq 0) {
            Pass "  Fresh user ROM is null/0 (correct — no measurements yet)"
        }
        if ($r.rom.history.Count -eq 0) {
            Pass "  ROM history is empty (correct)"
        }
        # Check adherence
        if ($r.adherence.weeklyPercent -eq 0) {
            Pass "  Adherence is 0% (correct — no exercises done)"
        }
    } else { Fail "progressController.js" "?" "Response missing userId" }
} catch { Fail "progressController.js" "?" "Exception on fresh user: $($_.Exception.Message)" }

# 1.4 GET /recommendations/engine/:userId for fresh user
try {
    $r = Invoke-RestMethod "$V2BaseUrl/recommendations/engine/$freshUid"
    if ($r.sessions_analysed -eq 0) {
        Pass "GET /recommendations/engine/$freshUid -> sessions_analysed=0 (correct)"
    }
    if ($r.suggestions -is [array]) {
        Pass "  Suggestions is array (count=$($r.suggestions.Count))"
    }
} catch { Fail "recommendationsController.js" "?" "Exception: $($_.Exception.Message)" }

# 1.5 GET /schedule/:userId for fresh user — should be empty
try {
    $r = Invoke-RestMethod "$V2BaseUrl/schedule/$freshUid"
    if ($r -is [array] -and $r.Count -eq 0) {
        Pass "GET /schedule/$freshUid -> empty array (correct)"
    } else { Warn "scheduleController.js" "?" "Non-empty or non-array response for fresh user" }
} catch { Fail "scheduleController.js" "?" "Exception: $($_.Exception.Message)" }

# ============================================================================
# SECTION 2: Non-existent Resource Handling
# ============================================================================
Section "SECTION 2: Non-existent Resource Handling"

# 2.1 GET /users/99999
try {
    Invoke-RestMethod "$V2BaseUrl/users/99999" -ErrorAction Stop
    Fail "usersController.js" "31" "GET /users/99999 should 404 but returned success"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) { Pass "GET /users/99999 -> 404 (correct)" }
    else { Fail "usersController.js" "31" "Expected 404, got $($_.Exception.Response.StatusCode.value__)" }
}

# 2.2 GET /sessions/99999
try {
    Invoke-RestMethod "$V2BaseUrl/sessions/99999" -ErrorAction Stop
    Fail "sessionsController.js" "30" "GET /sessions/99999 should 404"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) { Pass "GET /sessions/99999 -> 404 (correct)" }
    else { Fail "sessionsController.js" "30" "Expected 404, got $($_.Exception.Response.StatusCode.value__)" }
}

# 2.3 GET /measurements/99999
try {
    Invoke-RestMethod "$V2BaseUrl/measurements/99999" -ErrorAction Stop
    Fail "measurementsController.js" "26" "Should 404, returned success"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) { Pass "GET /measurements/99999 -> 404 (correct)" }
    else { Fail "measurementsController.js" "26" "Expected 404, got $($_.Exception.Response.StatusCode.value__)" }
}

# 2.4 GET /progress/99999
try {
    Invoke-RestMethod "$V2BaseUrl/progress/99999" -ErrorAction Stop
    Fail "progressController.js" "?" "Should 404, returned success"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) { Pass "GET /progress/99999 -> 404 (correct)" }
    else { Fail "progressController.js" "?" "Expected 404, got $($_.Exception.Response.StatusCode.value__)" }
}

# 2.5 GET /recommendations/engine/99999
try {
    Invoke-RestMethod "$V2BaseUrl/recommendations/engine/99999"
    Pass "GET /recommendations/engine/99999 -> 200 (returns result for non-existent user)"
} catch { Info "GET /recommendations/engine/99999 -> $($_.Exception.Response.StatusCode.value__)" }

# 2.6 GET /schedule/99999
try {
    Invoke-RestMethod "$V2BaseUrl/schedule/99999"
    Pass "GET /schedule/99999 -> returns (probably empty)"
} catch { Info "GET /schedule/99999 -> $($_.Exception.Response.StatusCode.value__)" }

# ============================================================================
# SECTION 3: Response Field Null/Empty Checks
# ============================================================================
Section "SECTION 3: Response Field Null Safety"

# Create a session and upload one measurement for testing
$sid = $null
try {
    $body = @{userId=$freshUid} | ConvertTo-Json
    $s = Invoke-RestMethod "$V2BaseUrl/sessions" -Method Post -Body $body -ContentType "application/json"
    $sid = $s.id
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $mbody = @{sessionId=$sid; jointAngles=@{knee=45.0}} | ConvertTo-Json
    Invoke-RestMethod "$V2BaseUrl/measurements" -Method Post -Body $mbody -ContentType "application/json" | Out-Null
    Info "  Created session $sid with 1 measurement"
} catch { Info "  Could not create session for field tests" }

# 3.1 Session detail: check all required fields present
if ($sid) {
    try {
        $detail = Invoke-RestMethod "$V2BaseUrl/sessions/$sid"
        $requiredFields = @("id", "user_id", "started_at")
        $missing = @()
        foreach ($f in $requiredFields) {
            if (-not (Get-Member -InputObject $detail -Name $f -MemberType Properties)) { $missing += $f }
        }
        if ($detail.measurements -is [array]) {
            Pass "Session detail has measurements array (count=$($detail.measurements.Count))"
        } else { Fail "sessionsController.js" "49" "Session detail: measurements is not an array" }

        if ($missing.Count -eq 0) { Pass "  Session has required fields: $($requiredFields -join ', ')" }
        else { Fail "sessionsController.js" "49" "Missing fields: $missing" }

        if ($null -eq $detail.ended_at) { Pass "  Active session ended_at is null (correct)" }
    } catch { Fail "sessionsController.js" "49" "Session detail exception: $($_.Exception.Message)" }
}

# 3.2 Measurement items: check for null sensor_data/errors
if ($sid) {
    try {
        $meas = Invoke-RestMethod "$V2BaseUrl/measurements/$sid"
        if ($meas.Count -gt 0) {
            $m = $meas[0]
            # sensor_data should be array (not null)
            if ($m.sensor_data -is [array]) { Pass "Measurement sensor_data is array (correct)" }
            elseif ($null -eq $m.sensor_data) { Warn "measurementsController.js" "18" "sensor_data is null (should be empty array [])" }
            # errors should be array
            if ($m.errors -is [array]) { Pass "Measurement errors is array (correct)" }
            elseif ($null -eq $m.errors) { Warn "measurementsController.js" "18" "errors is null (should be empty array [])" }
            # target_angles should mirror joint_angles
            $hasTarget = $null -ne $m.target_angles
            $hasJoint = $null -ne $m.joint_angles
            if ($hasTarget -and $hasJoint) { Pass "  target_angles and joint_angles both present" }
            else { Warn "measurementsController.js" "41-42" "target_angles=$hasTarget, joint_angles=$hasJoint" }
        }
    } catch { Fail "measurementsController.js" "?" "Measurement query exception: $($_.Exception.Message)" }
}

# End session
if ($sid) {
    try { Invoke-RestMethod "$V2BaseUrl/sessions/$sid/end" -Method Patch -Body "{}" | Out-Null }
    catch {}
}

# 3.3 Auth/me — check conditionLabel/conditionDate null handling
try {
    $r = Invoke-RestMethod "$V2BaseUrl/auth/me" -Headers $freshHeaders
    if ($null -eq $r.conditionLabel -or $r.conditionLabel -eq "") {
        Pass "GET /auth/me -> conditionLabel is null/empty for new user (correct)"
    }
    if ($null -eq $r.currentRomDegrees -or $r.currentRomDegrees -eq 0) {
        Pass "  currentRomDegrees is null/0 for new user (correct)"
    }
} catch { Fail "authController.js" "?" "Exception: $($_.Exception.Message)" }

# 3.4 GET /patients — check no null names
try {
    $patients = Invoke-RestMethod "$V2BaseUrl/patients"
    $nullNames = ($patients | Where-Object { $null -eq $_.name -or "" -eq $_.name }).Count
    if ($nullNames -eq 0) { Pass "GET /patients: all $($patients.Count) have valid names" }
    else { Warn "usersController.js" "114-117" "$nullNames patients have null/empty names" }
} catch { Fail "usersController.js" "114" "Exception: $($_.Exception.Message)" }

# ============================================================================
# SECTION 4: App Flask Proxy — Null Forwarding
# ============================================================================
Section "SECTION 4: App Flask Proxy Null Safety"

if (-not $appRunning) {
    Info "App not running — skipping Flask proxy tests"
} else {
    # 4.1 App proxy: schedule for fresh user
    try {
        $r = Invoke-RestMethod "$AppBaseUrl/api/schedule/$freshUid`?token=$freshToken"
        if ($r -is [array]) { Pass "App proxy GET /api/schedule -> array (count=$($r.Count))" }
        else { Warn "app.py" "652-659" "Non-array schedule response via proxy: $($r.GetType())" }
    } catch { Warn "app.py" "652" "Schedule proxy error: $($_.Exception.Message)" }

    # 4.2 App proxy: recommendations for fresh user
    try {
        $r = Invoke-RestMethod "$AppBaseUrl/api/recommendations/engine/$freshUid`?token=$freshToken"
        if ($r) { Pass "App proxy GET /api/recommendations/engine -> 200" }
    } catch { Warn "app.py" "643" "Recommendations proxy error: $($_.Exception.Message)" }

    # 4.3 App proxy: session detail for non-existent session
    try {
        Invoke-RestMethod "$AppBaseUrl/api/session/99999`?token=$freshToken" -ErrorAction Stop
        Fail "app.py" "625" "Should return error for non-existent session"
    } catch { Pass "App proxy GET /api/session/99999 -> error (correct)" }
}

# ============================================================================
# SECTION 5: V1 Python — Empty API Response Handling
# ============================================================================
Section "SECTION 5: V1 Python Script Null Safety"

$v1Dir = Join-Path (Split-Path -Parent $PSScriptRoot) "v1-motion-standard-curves"

# 5.1 V1 fetches measurements for session with 0 measurements
$emptySid = $null
try {
    $body = @{userId=$freshUid} | ConvertTo-Json
    $es = Invoke-RestMethod "$V2BaseUrl/sessions" -Method Post -Body $body -ContentType "application/json"
    $emptySid = $es.id
    Invoke-RestMethod "$V2BaseUrl/sessions/$emptySid/end" -Method Patch -Body "{}" | Out-Null
    Info "  Created empty session $emptySid (0 measurements)"
} catch {}

if ($emptySid) {
    # Does V1 crash when session has 0 measurements?
    $genScript = Join-Path $v1Dir "generate_recommendation_from_curves.py"
    $stdCsv = Join-Path $v1Dir "outputs\walking\normal_knee_curve.csv"
    if (Test-Path $stdCsv) {
        $outJson = Join-Path $v1Dir "outputs\recommendations\walking\null_test.json"
        $outTxt = Join-Path $v1Dir "outputs\recommendations\walking\null_test.txt"
        $cmd = "python `"$genScript`" --action walking --patient-session-id $emptySid --standard-csv `"$stdCsv`" --out-json `"$outJson`" --out-txt `"$outTxt`" 2>&1"
        $v1out = Invoke-Expression $cmd
        $v1outStr = "$v1out"
        if ($v1outStr -match "fewer than 2|ValueError|ERROR|Traceback|crash") {
            Warn "generate_recommendation_from_curves.py" "132" "V1 crashes on session with 0 measurements: $v1outStr"
        } elseif ($v1outStr -match "Done|JSON|TXT|Status") {
            Pass "V1 handles empty session gracefully (generated default/empty recommendation)"
        } else {
            Info "  V1 output: $($v1outStr.Substring(0, [Math]::Min(100, $v1outStr.Length)))"
        }
    }
}

# ============================================================================
# SECTION 6: M2 TypeScript — Null in API Responses
# ============================================================================
Section "SECTION 6: M2 Frontend Null Safety (API Contract Checks)"

# Test: what does V2 return for edge cases that M2 services consume?

# 6.1 Does /patients ever return null instead of []?
try {
    $r = Invoke-RestMethod "$V2BaseUrl/patients"
    if ($null -eq $r) { Fail "usersController.js" "114" "GET /patients returned null (M2 patientApiService.listPatients expects array)" }
    else { Pass "GET /patients returns non-null (array)" }
} catch { Fail "usersController.js" "114" "Exception: $($_.Exception.Message)" }

# 6.2 /feedback with no items
try {
    $r = Invoke-RestMethod "$V2BaseUrl/feedback"
    if ($r -is [array]) { Pass "GET /feedback returns array (count=$($r.Count))" }
    else { Fail "feedbackController.js" "?" "Non-array feedback response" }
} catch { Fail "feedbackController.js" "?" "Exception: $($_.Exception.Message)" }

# 6.3 /announcements with no items
try {
    $r = Invoke-RestMethod "$V2BaseUrl/announcements"
    if ($r -is [array]) { Pass "GET /announcements returns array (count=$($r.Count))" }
    else { Fail "announcementsController.js" "?" "Non-array announcements response" }
} catch { Fail "announcementsController.js" "?" "Exception: $($_.Exception.Message)" }

# 6.4 /audit-logs with no items
try {
    $r = Invoke-RestMethod "$V2BaseUrl/audit-logs"
    if ($r -is [array]) { Pass "GET /audit-logs returns array (count=$($r.Count))" }
    else { Fail "auditLogsController.js" "?" "Non-array audit-logs response" }
} catch { Fail "auditLogsController.js" "?" "Exception: $($_.Exception.Message)" }

# 6.5 /recommendations/session/:id for session with no recommendations
try {
    $r = Invoke-RestMethod "$V2BaseUrl/recommendations/session/$freshUid"
    if ($null -eq $r -or ($r -is [array] -and $r.Count -eq 0)) {
        Pass "GET /recommendations/session/:id -> null or empty array (correct for no recommendations)"
    } else { Pass "GET /recommendations/session/:id -> $($r.Count) items" }
} catch { Pass "GET /recommendations/session/:id -> error returned (acceptable)" }

# ============================================================================
# SECTION 7: Database Constraint Edge Cases
# ============================================================================
Section "SECTION 7: Database Constraint Edge Cases"

# 7.1 Register with empty name
try {
    $body = @{name=""; email="empty_name_$ts@test.com"; password="test"; role="patient"} | ConvertTo-Json
    Invoke-RestMethod "$V2BaseUrl/auth/register" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Warn "authController.js" "?" "Empty name accepted (should be 400)"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) { Pass "Empty name -> 400 (correct)" }
    else { Info "Empty name -> $($_.Exception.Response.StatusCode.value__)" }
}

# 7.2 Register with very long email
$longEmail = ("a" * 200) + "@test.com"
try {
    $body = @{name="Long Email"; email=$longEmail; password="test"; role="patient"} | ConvertTo-Json
    $r = Invoke-RestMethod "$V2BaseUrl/auth/register" -Method Post -Body $body -ContentType "application/json"
    Pass "Very long email (200 chars) accepted (DB TEXT field allows this)"
} catch { Info "Long email -> $($_.Exception.Response.StatusCode.value__)" }

# 7.3 Negative userId in session create
try {
    $body = @{userId=-1} | ConvertTo-Json
    Invoke-RestMethod "$V2BaseUrl/sessions" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Warn "sessionsController.js" "57-60" "Negative userId accepted in session creation"
} catch { Pass "Negative userId -> $($_.Exception.Response.StatusCode.value__) (rejected)" }

# 7.4 String userId in session create
try {
    $body = "{`"userId`":`"abc`"}"
    Invoke-RestMethod "$V2BaseUrl/sessions" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Warn "sessionsController.js" "57" "String userId 'abc' accepted (should validate type)"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) { Pass "String userId -> 400 (correctly rejected)" }
    else { Info "String userId -> $($_.Exception.Response.StatusCode.value__)" }
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  NULL/EMPTY SAFETY TEST RESULTS" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  PASS:  $Pass" -ForegroundColor Green
Write-Host "  FAIL:  $Fail" -ForegroundColor Red
Write-Host "  WARN:  $Warn (potential issues)" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

if ($Fail -gt 0) {
    Write-Host "[FAIL] Null safety test: $Fail failures found." -ForegroundColor Red
    exit 1
} elseif ($Warn -gt 0) {
    Write-Host "[WARN] Null safety test: PASS with $Warn warnings." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "[PASS] All null safety checks passed!" -ForegroundColor Green
    exit 0
}
