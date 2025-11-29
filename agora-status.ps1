# Agora Status Check Script

Write-Host "=== AGORA STATUS CHECK ===" -ForegroundColor Green

$APP_ID = "1a3cb8e2d1174dd097edcc38466983a0"

Write-Host ""
Write-Host "App ID: $APP_ID" -ForegroundColor Cyan
Write-Host "Project URL: https://console.agora.io/" -ForegroundColor Cyan

Write-Host ""
Write-Host "Current Configuration:" -ForegroundColor Yellow

if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "VITE_AGORA_APP_ID") {
        Write-Host "✓ App ID configured" -ForegroundColor Green
    } else {
        Write-Host "✗ App ID not found" -ForegroundColor Red
    }
    
    if ($envContent -match "VITE_AGORA_APP_CERTIFICATE") {
        Write-Host "✓ Certificate configured (Secure Mode)" -ForegroundColor Green
    } else {
        Write-Host "○ No Certificate (Testing Mode)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Available Commands:" -ForegroundColor Yellow
Write-Host "1. Run setup:      .\setup-agora.ps1"
Write-Host "2. Test app:       npm run dev"
Write-Host "3. Test Agora:     http://localhost:5173/test-agora.html"