#!/usr/bin/env pwsh

# Agora Configuration CLI Script
# This script helps configure your Agora project for the Islamic Community App

Write-Host "
=== AGORA CONFIGURATION CLI ===" -ForegroundColor Green

Write-Host "
App ID: 1a3cb8e2d1174dd097edcc38466983a0
" -ForegroundColor Cyan

Write-Host "STEP 1: Testing Your Current Configuration" -ForegroundColor Yellow
Write-Host "---------------------------------------"

# Check if we can reach Agora services
try {
    Write-Host "Testing internet connectivity to Agora..." -NoNewline
    $response = Invoke-RestMethod -Uri "https://api.agora.io/dev/v1/projects" -Method GET -ErrorAction Stop -TimeoutSec 10
    Write-Host " ✓ Connected" -ForegroundColor Green
} catch {
    Write-Host " ✗ Failed" -ForegroundColor Red
    Write-Host "Internet connection issue. Please check your network." -ForegroundColor Red
    exit 1
}

Write-Host "
STEP 2: Choose Configuration Mode" -ForegroundColor Yellow
Write-Host "--------------------------------"

Write-Host "
1. Testing Mode (App ID only) - Recommended for Development
   - No token required
   - Easy to set up
   - Perfect for development and testing

2. Secure Mode (App ID + Certificate) - For Production
   - Requires tokens for security
   - Needs server-side token generation
   - Better for production deployment
"

$choice = Read-Host "Select mode (1 for Testing, 2 for Secure)"

if ($choice -eq "1") {
    Write-Host "
CONFIGURING TESTING MODE" -ForegroundColor Green
    Write-Host "========================"
    
    Write-Host "
To configure your Agora project for Testing Mode:

1. Open: https://console.agora.io/
2. Sign in with your Agora account
3. Find project: 1a3cb8e2d1174dd097edcc38466983a0
4. Go to: Overview → Authentication
5. Select: 'Testing mode: App ID'
6. Click: Save

This allows your app to connect using only the App ID (no tokens needed).
    " -ForegroundColor White
    
    Write-Host "After configuring, test the connection:" -ForegroundColor Yellow
    Write-Host "npm run dev" -ForegroundColor Cyan
    Write-Host "Then open: http://localhost:5173/test-agora.html" -ForegroundColor Cyan
    
} elseif ($choice -eq "2") {
    Write-Host "
CONFIGURING SECURE MODE" -ForegroundColor Green
    Write-Host "======================="
    
    $cert = Read-Host "Enter your Agora App Certificate (from Agora Console)"
    
    if ($cert -and $cert.Length -gt 0) {
        Write-Host "
Setting up secure mode with certificate..." -ForegroundColor Yellow
        
        # Update environment variables
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "VITE_AGORA_APP_CERTIFICATE=.*") {
            $envContent = $envContent -replace "VITE_AGORA_APP_CERTIFICATE=.*", "VITE_AGORA_APP_CERTIFICATE=$cert"
        } else {
            $envContent += "`nVITE_AGORA_APP_CERTIFICATE=$cert"
        }
        
        Set-Content ".env" $envContent
        
        Write-Host "✓ App Certificate saved to .env" -ForegroundColor Green
        
        Write-Host "
Now deploying token generation service to Supabase..." -ForegroundColor Yellow
        
        # Deploy the edge function
        try {
            Write-Host "Deploying Supabase edge function..." -NoNewline
            & npx supabase functions deploy generate-agora-token 2>$null
            Write-Host " ✓ Deployed" -ForegroundColor Green
            
            # Set environment variables in Supabase
            Write-Host "Setting Supabase environment variables..." -NoNewline
            & npx supabase secrets set AGORA_APP_ID=1a3cb8e2d1174dd097edcc38466983a0 2>$null
            & npx supabase secrets set AGORA_APP_CERTIFICATE=$cert 2>$null
            Write-Host " ✓ Configured" -ForegroundColor Green
            
        } catch {
            Write-Host " ✗ Failed" -ForegroundColor Red
            Write-Host "
Manual deployment required:
1. Go to: https://supabase.com/dashboard/project/jtmmeumzjcldqukpqcfi/functions
2. Create function: generate-agora-token
3. Copy code from: supabase/functions/generate-agora-token/index.ts
4. Set environment variables:
   - AGORA_APP_ID: 1a3cb8e2d1174dd097edcc38466983a0
   - AGORA_APP_CERTIFICATE: $cert
            " -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "App Certificate is required for secure mode." -ForegroundColor Red
        Write-Host "Get it from: https://console.agora.io/ → Your Project → Authentication" -ForegroundColor Yellow
        exit 1
    }
    
} else {
    Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
    exit 1
}

Write-Host "
STEP 3: Testing Configuration" -ForegroundColor Yellow
Write-Host "----------------------------"

Write-Host "Starting development server to test..." -ForegroundColor White
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"

Start-Sleep 3

Write-Host "
✅ Configuration Complete!" -ForegroundColor Green
Write-Host "
Test your setup:
1. Open: http://localhost:5173/test-agora.html
2. Check console for connection status
3. Try the livestream feature in your app

If you see 'SUCCESS', your Agora configuration is working!
" -ForegroundColor White

Write-Host "
Need help? Check the console logs for detailed error messages.
" -ForegroundColor Gray