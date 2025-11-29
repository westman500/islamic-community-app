# Agora CLI Manager - Simplified Version
param(
    [string]$Command = "status"
)

$AGORA_APP_ID = "1a3cb8e2d1174dd097edcc38466983a0"

Write-Host "=== AGORA CLI MANAGER ===" -ForegroundColor Green
Write-Host "App ID: $AGORA_APP_ID" -ForegroundColor Cyan
Write-Host ""

switch ($Command.ToLower()) {
    "status" {
        Write-Host "Current Configuration:" -ForegroundColor Yellow
        
        if (Test-Path ".env") {
            $envContent = Get-Content ".env" -Raw
            if ($envContent -match "VITE_AGORA_APP_ID") {
                Write-Host "✓ Local App ID configured" -ForegroundColor Green
            } else {
                Write-Host "✗ Local App ID missing" -ForegroundColor Red
            }
        }
        
        Write-Host "Checking Supabase secrets..." -ForegroundColor Cyan
        try {
            $secrets = npx supabase secrets list
            if ($secrets -match "AGORA_APP_ID") {
                Write-Host "✓ Supabase App ID configured" -ForegroundColor Green
            }
            if ($secrets -match "AGORA_APP_CERTIFICATE") {
                Write-Host "✓ App Certificate configured (Secure Mode)" -ForegroundColor Green
            } else {
                Write-Host "○ No Certificate (Testing Mode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "✗ Cannot access Supabase secrets" -ForegroundColor Red
        }
    }
    
    "login" {
        Write-Host "Configuring Agora authentication..." -ForegroundColor Yellow
        
        Write-Host "Setting up Supabase secrets..." -ForegroundColor Cyan
        npx supabase secrets set AGORA_APP_ID=$AGORA_APP_ID
        
        $choice = Read-Host "Configure secure mode with certificate? (Y/N)"
        if ($choice -eq "Y" -or $choice -eq "y") {
            $cert = Read-Host "Enter your App Certificate"
            if ($cert) {
                npx supabase secrets set AGORA_APP_CERTIFICATE=$cert
                Write-Host "✓ Secure mode configured" -ForegroundColor Green
                
                Write-Host "Deploying token service..." -ForegroundColor Cyan
                npx supabase functions deploy generate-agora-token --no-verify-jwt
            }
        } else {
            Write-Host "✓ Testing mode configured (App ID only)" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "✅ Agora CLI configuration complete!" -ForegroundColor Green
    }
    
    "test" {
        Write-Host "Testing Agora connection..." -ForegroundColor Yellow
        
        Write-Host "Starting development server..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Minimized
        Start-Sleep 3
        
        Write-Host "Opening test page..." -ForegroundColor Cyan
        Start-Process "http://localhost:5173/test-agora.html"
    }
    
    "console" {
        Write-Host "Opening Agora Console..." -ForegroundColor Cyan
        Start-Process "https://console.agora.io/"
    }
    
    "deploy" {
        Write-Host "Deploying token generation service..." -ForegroundColor Yellow
        npx supabase functions deploy generate-agora-token --no-verify-jwt
        Write-Host "✓ Token service deployed" -ForegroundColor Green
    }
    
    default {
        Write-Host "Available commands:" -ForegroundColor Yellow
        Write-Host "  .\agora.ps1 status   - Show configuration status" -ForegroundColor White
        Write-Host "  .\agora.ps1 login    - Configure Agora authentication" -ForegroundColor White
        Write-Host "  .\agora.ps1 test     - Test connection" -ForegroundColor White
        Write-Host "  .\agora.ps1 console  - Open Agora Console" -ForegroundColor White
        Write-Host "  .\agora.ps1 deploy   - Deploy token service" -ForegroundColor White
    }
}