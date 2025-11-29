#!/usr/bin/env pwsh

# Quick Agora Status Checker

Write-Host "
=== AGORA STATUS CHECK ===" -ForegroundColor Green

$APP_ID = "1a3cb8e2d1174dd097edcc38466983a0"

Write-Host "App ID: $APP_ID" -ForegroundColor Cyan
Write-Host "Project URL: https://console.agora.io/" -ForegroundColor Cyan

Write-Host "
Current Configuration:" -ForegroundColor Yellow

# Check .env file
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "VITE_AGORA_APP_ID=(.+)") {
        $configuredAppId = $matches[1]
        if ($configuredAppId -eq $APP_ID) {
            Write-Host "✓ App ID configured correctly" -ForegroundColor Green
        } else {
            Write-Host "✗ App ID mismatch: $configuredAppId" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ App ID not found in .env" -ForegroundColor Red
    }
    
    if ($envContent -match "VITE_AGORA_APP_CERTIFICATE=(.+)") {
        Write-Host "✓ App Certificate configured (Secure Mode)" -ForegroundColor Green
        $mode = "Secure Mode"
    } else {
        Write-Host "○ No App Certificate (Testing Mode)" -ForegroundColor Yellow
        $mode = "Testing Mode"
    }
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    exit 1
}

Write-Host "
Detected Mode: $mode" -ForegroundColor Cyan

Write-Host "
Quick Actions:" -ForegroundColor Yellow
Write-Host "1. Test connection:    npm run dev → http://localhost:5173/test-agora.html"
Write-Host "2. Configure Agora:    .\setup-agora.ps1"
Write-Host "3. Open Agora Console: https://console.agora.io/"
Write-Host "4. View project logs:  Check browser console for detailed errors"