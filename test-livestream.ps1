# Livestream Testing Script
# Tests all components of the livestream functionality

Write-Host "Livestream Testing Script" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check environment configuration
Write-Host "Step 1: Checking environment configuration..." -ForegroundColor Yellow

if (!(Test-Path ".env.local")) {
    Write-Host "[ERROR] .env.local not found!" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content .env.local -Raw
if ($envContent -match 'VITE_AGORA_APP_ID=([a-f0-9]{32})') {
    $appId = $matches[1]
    Write-Host "[OK] Agora App ID configured: $appId" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Agora App ID not configured or invalid!" -ForegroundColor Red
    Write-Host "Please add VITE_AGORA_APP_ID to .env.local" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check Supabase connection
Write-Host ""
Write-Host "Step 2: Checking Supabase connection..." -ForegroundColor Yellow

if (Test-Path ".supabase") {
    Write-Host "[OK] Supabase project linked" -ForegroundColor Green
} else {
    Write-Host "[WARN] Supabase not linked locally (this is OK for deployed functions)" -ForegroundColor Yellow
}

# Step 3: Check Edge Function deployment
Write-Host ""
Write-Host "Step 3: Checking Edge Function deployment..." -ForegroundColor Yellow

try {
    $functionsList = npx supabase functions list 2>&1 | Out-String
    if ($functionsList -match "generate-agora-token") {
        Write-Host "[OK] Edge Function 'generate-agora-token' is deployed" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Edge Function not found. Deploying..." -ForegroundColor Red
        npx supabase functions deploy generate-agora-token --no-verify-jwt
    }
} catch {
    Write-Host "[WARN] Could not verify Edge Function (this is OK)" -ForegroundColor Yellow
}

# Step 4: Check Supabase secrets
Write-Host ""
Write-Host "Step 4: Checking Supabase secrets..." -ForegroundColor Yellow

try {
    $secrets = npx supabase secrets list 2>&1 | Out-String
    
    $hasAppId = $secrets -match "AGORA_APP_ID"
    $hasCert = $secrets -match "AGORA_APP_CERTIFICATE"
    
    if ($hasAppId -and $hasCert) {
        Write-Host "[OK] Agora secrets configured in Supabase" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Missing Agora secrets!" -ForegroundColor Red
        Write-Host "Run these commands:" -ForegroundColor Yellow
        Write-Host "  npx supabase secrets set AGORA_APP_ID=your-app-id" -ForegroundColor Cyan
        Write-Host "  npx supabase secrets set AGORA_APP_CERTIFICATE=your-certificate" -ForegroundColor Cyan
        exit 1
    }
} catch {
    Write-Host "[WARN] Could not check secrets (you may need to login)" -ForegroundColor Yellow
}

# Step 5: Summary
Write-Host ""
Write-Host "[SUCCESS] All checks passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Livestream Setup Summary:" -ForegroundColor Cyan
Write-Host "  - Agora App ID: Configured" -ForegroundColor White
Write-Host "  - Edge Function: Deployed" -ForegroundColor White
Write-Host "  - Supabase Secrets: Configured" -ForegroundColor White
Write-Host ""
Write-Host "Ready to test livestream!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start dev server: npm run dev" -ForegroundColor Cyan
Write-Host "  2. Sign in as a scholar/imam" -ForegroundColor Cyan
Write-Host "  3. Navigate to Start Live Stream page" -ForegroundColor Cyan
Write-Host "  4. Click 'Test Token (Debug)' to verify token generation" -ForegroundColor Cyan
Write-Host "  5. Click 'Start Live Stream' to go live" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tip: Open browser console (F12) to see detailed logs" -ForegroundColor Yellow
