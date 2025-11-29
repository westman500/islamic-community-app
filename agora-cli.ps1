# Agora CLI Management Script
# This script provides CLI interface for Agora configuration

param(
    [string]$Command = "status",
    [string]$AppId = "1a3cb8e2d1174dd097edcc38466983a0",
    [string]$AppCertificate = "",
    [string]$Action = "",
    [string]$ProjectRef = "",
    [string]$Channel = "devtest",
    [string]$Uid = "0",
    [string]$Role = "host",
    [ValidateSet('supabase','docker','npm')]
    [string]$Server = 'supabase'
)

# Configuration
$AGORA_APP_ID = "1a3cb8e2d1174dd097edcc38466983a0"
$AGORA_CONSOLE_URL = "https://console.agora.io/"
$DEFAULT_PROJECT_REF = "jtmmeumzjcldqukpqcfi"

function Show-Header {
    Write-Host "
=== AGORA CLI MANAGER ===" -ForegroundColor Green
    Write-Host "App ID: $AGORA_APP_ID" -ForegroundColor Cyan
    Write-Host "Console: $AGORA_CONSOLE_URL" -ForegroundColor Gray
    Write-Host ""
}

function Show-Status {
    Write-Host "Current Configuration:" -ForegroundColor Yellow
    
    # Check local .env
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "VITE_AGORA_APP_ID=(.+)") {
            Write-Host "[OK] Local App ID: $($matches[1])" -ForegroundColor Green
        } else {
            Write-Host "[ERR] Local App ID not found" -ForegroundColor Red
        }
    }
    
    # Check Supabase secrets
    Write-Host "Checking Supabase configuration..." -ForegroundColor Cyan
    try {
        $secrets = & npx supabase secrets list 2>$null
        if ($secrets -match "AGORA_APP_ID") {
            Write-Host "[OK] Supabase App ID configured" -ForegroundColor Green
        } else {
            Write-Host "[ERR] Supabase App ID not configured" -ForegroundColor Red
        }
        
        if ($secrets -match "AGORA_APP_CERTIFICATE") {
            Write-Host "[OK] Supabase App Certificate configured (Secure Mode)" -ForegroundColor Green
        } else {
        Write-Host "  .\agora-cli.ps1 token -Server docker -Channel test -Uid 12345" -ForegroundColor Gray
            Write-Host "[INFO] No App Certificate (Testing Mode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERR] Cannot check Supabase secrets" -ForegroundColor Red
    }
}

function Get-ProjectRef {
    if ($ProjectRef -and $ProjectRef.Trim().Length -gt 0) { return $ProjectRef }
    if ($env:SUPABASE_PROJECT_REF -and $env:SUPABASE_PROJECT_REF.Trim().Length -gt 0) { return $env:SUPABASE_PROJECT_REF }
    return $DEFAULT_PROJECT_REF
}

function Test-TokenGeneration {
    $proj = Get-ProjectRef
    $fnUrl = "https://$proj.functions.supabase.co/generate-agora-token"
    Write-Host "Testing token service: $fnUrl" -ForegroundColor Yellow

    $body = @{ channelName = $Channel; role = $Role; uid = $Uid } | ConvertTo-Json
    $headers = @{ 'x-public-test' = 'true' }
    try {
        $resp = Invoke-RestMethod -Method Post -Uri $fnUrl -ContentType 'application/json' -Headers $headers -Body $body -TimeoutSec 20
        if (-not $resp) { throw "No response from function" }

        $token = $resp.token
        $respAppId = $resp.appId

        if (-not $token) { throw "Response missing 'token'" }
        if (-not $respAppId) { throw "Response missing 'appId'" }

        $prefixOk = $token.StartsWith("007")
        $appIdOk = ($respAppId -eq $AGORA_APP_ID)

        if ($prefixOk -and $appIdOk) {
            Write-Host "[OK] Token generated (AccessToken2) and App ID matches" -ForegroundColor Green
        } else {
            if (-not $prefixOk) { Write-Host "! Token does not start with '007' (version mismatch)" -ForegroundColor Yellow }
            if (-not $appIdOk) { Write-Host "! App ID mismatch. Expected $AGORA_APP_ID, got $respAppId" -ForegroundColor Yellow }
        }

        $len = ($token | Measure-Object -Character).Characters
        Write-Host "Token length: $len" -ForegroundColor Gray
        if ($len -ge 12) { Write-Host "Sample: $($token.Substring(0,12))..." -ForegroundColor Gray }

        Write-Host "
[OK] Token service reachable and responded.
Channel: $Channel | UID: $Uid | Role: $Role
        " -ForegroundColor Green
    } catch {
        Write-Host "[ERR] Token service test failed" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Hint: If your function requires JWT, deploy with --no-verify-jwt or include Authorization header." -ForegroundColor Gray
    }
}

function Set-TestingMode {
    Write-Host "Configuring Testing Mode..." -ForegroundColor Yellow
    
    # Update local environment
    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "VITE_AGORA_APP_ID=") {
            Write-Host "[OK] Local App ID already configured" -ForegroundColor Green
        } else {
            Add-Content ".env" "`nVITE_AGORA_APP_ID=$AGORA_APP_ID"
            Write-Host "[OK] Added App ID to .env" -ForegroundColor Green
        }
    }
    
    # Configure Supabase for testing mode
    Write-Host "Setting Supabase environment..." -ForegroundColor Cyan
    try {
        & npx supabase secrets set AGORA_APP_ID=$AGORA_APP_ID
        Write-Host "[OK] Supabase App ID configured" -ForegroundColor Green
        
        Write-Host "
    [OK] Testing Mode Configured!" -ForegroundColor Green
        Write-Host "
Next steps:
1. Go to: $AGORA_CONSOLE_URL
2. Find your project: $AGORA_APP_ID
3. Set authentication to 'App ID' mode
4. Test with: npm run dev
        " -ForegroundColor White
    } catch {
        Write-Host "[ERR] Failed to configure Supabase" -ForegroundColor Red
        Write-Host "Manual setup required" -ForegroundColor Yellow
    }
}

function Set-SecureMode {
    param([string]$Certificate)
    
    if (-not $Certificate) {
        $Certificate = Read-Host "Enter your Agora App Certificate"
    }
    
    if (-not $Certificate) {
        Write-Host "[ERR] App Certificate required for secure mode" -ForegroundColor Red
        return
    }
    
    Write-Host "Configuring Secure Mode..." -ForegroundColor Yellow
    
    try {
        # Set both App ID and Certificate in Supabase
        & npx supabase secrets set AGORA_APP_ID=$AGORA_APP_ID
        & npx supabase secrets set AGORA_APP_CERTIFICATE=$Certificate
        
        # Deploy token generation service
        Write-Host "Deploying token generation service..." -ForegroundColor Cyan
        & npx supabase functions deploy generate-agora-token --no-verify-jwt
        
        Write-Host "
[OK] Secure Mode Configured!" -ForegroundColor Green
        Write-Host "
Configuration:
- App ID: $AGORA_APP_ID
- Certificate: $($Certificate.Substring(0,8))...
- Token Service: Deployed

Your project is now in secure mode with automatic token generation.
        " -ForegroundColor White
        
    } catch {
        Write-Host "[ERR] Failed to configure secure mode" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

function Test-Connection {
    Write-Host "Testing Agora connection..." -ForegroundColor Yellow
    
    # Start dev server if not running
    $process = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" }
    if (-not $process) {
        Write-Host "Starting development server..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-Command", "cd '$PWD'; npm run dev" -WindowStyle Minimized
        Start-Sleep 3
    }
    
    # Open test page
    $testUrl = "http://localhost:5173/test-agora.html"
    Write-Host "Opening test page: $testUrl" -ForegroundColor Cyan
    Start-Process $testUrl
    
    Write-Host "
[OK] Test initiated!
Check the browser for connection results.
Look for 'SUCCESS' message or error details.
    " -ForegroundColor Green
}

function Show-Help {
    Write-Host "
AGORA CLI COMMANDS:
" -ForegroundColor Yellow
    Write-Host "  .\agora-cli.ps1 status        - Show current configuration" -ForegroundColor White
    Write-Host "  .\agora-cli.ps1 testing       - Configure testing mode" -ForegroundColor White
    Write-Host "  .\agora-cli.ps1 secure        - Configure secure mode" -ForegroundColor White
    Write-Host "  .\agora-cli.ps1 test          - Test connection" -ForegroundColor White
    Write-Host "  .\agora-cli.ps1 token         - Test token generation endpoint" -ForegroundColor White
    Write-Host "  .\agora-cli.ps1 console       - Open Agora Console" -ForegroundColor White
    Write-Host "  .\agora-cli.ps1 deploy        - Deploy token service" -ForegroundColor White
    Write-Host "
EXAMPLES:
" -ForegroundColor Yellow
    Write-Host "  .\agora-cli.ps1 secure -AppCertificate 'your_cert_here'" -ForegroundColor Gray
    Write-Host "  .\agora-cli.ps1 test" -ForegroundColor Gray
    Write-Host "  .\agora-cli.ps1 token -ProjectRef '<proj_ref>' -Channel 'myroom' -Uid '0' -Role 'host'" -ForegroundColor Gray
}

# Main execution
Show-Header

switch ($Command.ToLower()) {
    "status" { Show-Status }
    "testing" { Set-TestingMode }
    "secure" { Set-SecureMode -Certificate $AppCertificate }
    "test" { Test-Connection }
    "console" { Start-Process $AGORA_CONSOLE_URL }
    "deploy" { 
        Write-Host "Deploying token service..." -ForegroundColor Cyan
        & npx supabase functions deploy generate-agora-token --no-verify-jwt
    }
    "token" {
        switch ($Server) {
            'supabase' {
                Test-TokenGeneration
            }
            'docker' {
                $roleNum = if ($Role -eq 'host' -or $Role -eq 'publisher') { 1 } else { 2 }
                $bodyObj = @{ channelName = $Channel; uid = $Uid; tokenExpireTs = 3600; privilegeExpireTs = 3600; serviceRtc = @{ enable = $true; role = $roleNum } }
                $body = $bodyObj | ConvertTo-Json -Depth 4
                try {
                    $resp = Invoke-RestMethod -Uri 'http://localhost:8080/token/generate' -Method Post -ContentType 'application/json' -Body $body
                    if (-not $resp) { throw "No response from Docker service" }
                    $token = $resp.token
                    Write-Host "[OK] Docker token generated" -ForegroundColor Green
                    if ($token -and $token.StartsWith('007')) { Write-Host "[OK] Prefix: 007" -ForegroundColor Green } else { Write-Host "[WARN] Check token format" -ForegroundColor Yellow }
                    $len = ($token | Measure-Object -Character).Characters
                    Write-Host "Token length: $len" -ForegroundColor Gray
                } catch {
                    Write-Host "[ERR] Docker token request failed: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            'npm' {
                try {
                    $resp = Invoke-RestMethod -Uri "http://localhost:8080/rtcToken?channelName=$Channel" -Method Get
                    if (-not $resp) { throw "No response from NPM demo server" }
                    $key = $resp.key
                    Write-Host "[OK] NPM demo token generated" -ForegroundColor Green
                    if ($key -and $key.StartsWith('007')) { Write-Host "[OK] Prefix: 007" -ForegroundColor Green } else { Write-Host "[WARN] Check token format" -ForegroundColor Yellow }
                    $len = ($key | Measure-Object -Character).Characters
                    Write-Host "Token length: $len" -ForegroundColor Gray
                } catch {
                    Write-Host "[ERR] NPM demo request failed: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    }
    "help" { Show-Help }
    default { Show-Help }
}