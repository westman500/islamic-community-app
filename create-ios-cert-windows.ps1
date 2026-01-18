# Create iOS Distribution Certificate on Windows
# ==============================================
# This script helps create certificates without a Mac

Write-Host "🍎 iOS Certificate Creation (No Mac Required)" -ForegroundColor Cyan
Write-Host "=" * 50

# Check if OpenSSL is installed
$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
    Write-Host @"

❌ OpenSSL not found! Install it first:

Option 1: Install via Chocolatey (recommended):
  choco install openssl

Option 2: Download from:
  https://slproweb.com/products/Win32OpenSSL.html
  (Get the "Win64 OpenSSL Light" version)

After installing, restart PowerShell and run this script again.
"@ -ForegroundColor Red
    exit 1
}

Write-Host @"

📋 STEP 1: CREATE PRIVATE KEY & CSR
===================================
"@ -ForegroundColor Yellow

$keyFile = "ios_distribution.key"
$csrFile = "ios_distribution.csr"

if (-not (Test-Path $keyFile)) {
    Write-Host "Creating private key..." -ForegroundColor Green
    openssl genrsa -out $keyFile 2048
    Write-Host "✅ Private key created: $keyFile" -ForegroundColor Green
} else {
    Write-Host "✅ Private key already exists: $keyFile" -ForegroundColor Green
}

Write-Host @"

📋 STEP 2: CREATE CSR (Certificate Signing Request)
===================================================
Enter your details when prompted:
"@ -ForegroundColor Yellow

if (-not (Test-Path $csrFile)) {
    openssl req -new -key $keyFile -out $csrFile -subj "/emailAddress=your@email.com/CN=Your Name/C=US"
    Write-Host "✅ CSR created: $csrFile" -ForegroundColor Green
} else {
    Write-Host "✅ CSR already exists: $csrFile" -ForegroundColor Green
}

Write-Host @"

📋 STEP 3: UPLOAD CSR TO APPLE DEVELOPER
========================================
1. Go to: https://developer.apple.com/account/resources/certificates/add
2. Select "iOS Distribution (App Store and Ad Hoc)"
3. Click "Continue"
4. Upload this file: $((Get-Location).Path)\$csrFile
5. Download the certificate (.cer file)
6. Save it in this folder as: ios_distribution.cer

"@ -ForegroundColor Yellow

Read-Host "Press Enter after you've downloaded the .cer file"

$cerFile = "ios_distribution.cer"
$p12File = "ios_distribution.p12"

if (Test-Path $cerFile) {
    Write-Host @"

📋 STEP 4: CONVERT TO P12
=========================
"@ -ForegroundColor Yellow
    
    $password = Read-Host "Enter a password for the .p12 file" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    # Convert .cer to .pem
    openssl x509 -in $cerFile -inform DER -out ios_distribution.pem -outform PEM
    
    # Create .p12
    openssl pkcs12 -export -out $p12File -inkey $keyFile -in ios_distribution.pem -password pass:$plainPassword
    
    Write-Host "✅ P12 file created: $p12File" -ForegroundColor Green
    
    Write-Host @"

📋 STEP 5: CREATE BASE64 FOR GITHUB SECRETS
===========================================
"@ -ForegroundColor Yellow
    
    $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($p12File))
    $base64 | Out-File "certificate_base64.txt"
    
    Write-Host "✅ Base64 saved to: certificate_base64.txt" -ForegroundColor Green
    Write-Host "   Copy this content to GitHub secret: BUILD_CERTIFICATE_BASE64" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Certificate file not found: $cerFile" -ForegroundColor Red
    Write-Host "   Please download it from Apple Developer Portal first." -ForegroundColor Yellow
}

Write-Host @"

📋 STEP 6: CREATE PROVISIONING PROFILE
======================================
1. Go to: https://developer.apple.com/account/resources/profiles/add
2. Select "App Store" distribution
3. Select your App ID: com.masjidmobile.app
4. Select the certificate you just created
5. Download the .mobileprovision file
6. Run this to convert to base64:

   [Convert]::ToBase64String([IO.File]::ReadAllBytes("YourProfile.mobileprovision")) | Out-File "profile_base64.txt"

7. Copy the content to GitHub secret: PROVISIONING_PROFILE_BASE64

"@ -ForegroundColor Yellow

Write-Host @"

🎉 DONE!
========
After completing these steps, you'll have:
- BUILD_CERTIFICATE_BASE64 (from certificate_base64.txt)
- P12_PASSWORD (the password you entered)
- PROVISIONING_PROFILE_BASE64 (from profile_base64.txt)

Add these to GitHub Secrets and trigger the build!
"@ -ForegroundColor Green
