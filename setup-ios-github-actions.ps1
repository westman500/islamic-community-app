# iOS GitHub Actions Setup Helper
# This script helps you convert Apple certificates to base64 for GitHub Secrets

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iOS GitHub Actions Setup Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Prerequisites
Write-Host "[Step 1/6] Prerequisites Check" -ForegroundColor Yellow
Write-Host ""
Write-Host "You need:" -ForegroundColor White
Write-Host "  - Apple Developer Account" -ForegroundColor Green
Write-Host "  - Access to developer.apple.com" -ForegroundColor Green
Write-Host "  - GitHub repository access" -ForegroundColor Green
Write-Host ""

# Step 2: Certificate Instructions
Write-Host "[Step 2/6] iOS Distribution Certificate" -ForegroundColor Yellow
Write-Host ""
Write-Host "Get your .p12 certificate from:" -ForegroundColor White
Write-Host "  https://developer.apple.com/account/resources/certificates" -ForegroundColor Cyan
Write-Host ""
Write-Host "Steps:" -ForegroundColor White
Write-Host "  1. Create iOS Distribution certificate" -ForegroundColor Gray
Write-Host "  2. Download and export as .p12 file" -ForegroundColor Gray
Write-Host "  3. Set a password when exporting" -ForegroundColor Gray
Write-Host ""

$certPath = Read-Host "Enter path to .p12 file (or press Enter to skip)"

if ($certPath -and (Test-Path $certPath)) {
    try {
        $certBytes = [System.IO.File]::ReadAllBytes($certPath)
        $certBase64 = [System.Convert]::ToBase64String($certBytes)
        
        Write-Host "SUCCESS: Certificate converted" -ForegroundColor Green
        Write-Host ""
        Write-Host "GitHub Secret Name: BUILD_CERTIFICATE_BASE64" -ForegroundColor Yellow
        Write-Host "Value:" -ForegroundColor Yellow
        Write-Host $certBase64 -ForegroundColor Gray
        Write-Host ""
        
        $certBase64 | Out-File -FilePath "cert_base64.txt" -Encoding UTF8
        Write-Host "Saved to: cert_base64.txt" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "ERROR: Could not read certificate file" -ForegroundColor Red
        Write-Host $_  -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED: You can convert this manually later" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Provisioning Profile
Write-Host "[Step 3/6] Provisioning Profile" -ForegroundColor Yellow
Write-Host ""
Write-Host "Get your .mobileprovision file from:" -ForegroundColor White
Write-Host "  https://developer.apple.com/account/resources/profiles" -ForegroundColor Cyan
Write-Host ""
Write-Host "Steps:" -ForegroundColor White
Write-Host "  1. Create App Store profile" -ForegroundColor Gray
Write-Host "  2. Select App ID: com.masjidmobile.app" -ForegroundColor Gray
Write-Host "  3. Download .mobileprovision file" -ForegroundColor Gray
Write-Host ""

$profilePath = Read-Host "Enter path to .mobileprovision file (or press Enter to skip)"

if ($profilePath -and (Test-Path $profilePath)) {
    try {
        $profileBytes = [System.IO.File]::ReadAllBytes($profilePath)
        $profileBase64 = [System.Convert]::ToBase64String($profileBytes)
        
        Write-Host "SUCCESS: Profile converted" -ForegroundColor Green
        Write-Host ""
        Write-Host "GitHub Secret Name: BUILD_PROVISION_PROFILE_BASE64" -ForegroundColor Yellow
        Write-Host "Value:" -ForegroundColor Yellow
        Write-Host $profileBase64 -ForegroundColor Gray
        Write-Host ""
        
        $profileBase64 | Out-File -FilePath "profile_base64.txt" -Encoding UTF8
        Write-Host "Saved to: profile_base64.txt" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "ERROR: Could not read profile file" -ForegroundColor Red
        Write-Host $_ -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED: You can convert this manually later" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: App Store Connect API Key
Write-Host "[Step 4/6] App Store Connect API Key" -ForegroundColor Yellow
Write-Host ""
Write-Host "Get your .p8 API key from:" -ForegroundColor White
Write-Host "  https://appstoreconnect.apple.com/access/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Steps:" -ForegroundColor White
Write-Host "  1. Create new key with Developer/App Manager role" -ForegroundColor Gray
Write-Host "  2. Download .p8 file (shown only once!)" -ForegroundColor Gray
Write-Host "  3. Note the Key ID and Issuer ID" -ForegroundColor Gray
Write-Host ""

$apiKeyPath = Read-Host "Enter path to .p8 file (or press Enter to skip)"

if ($apiKeyPath -and (Test-Path $apiKeyPath)) {
    try {
        $apiKeyContent = Get-Content $apiKeyPath -Raw
        $apiKeyBase64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($apiKeyContent))
        
        Write-Host "SUCCESS: API Key converted" -ForegroundColor Green
        Write-Host ""
        Write-Host "GitHub Secret Name: APP_STORE_CONNECT_API_KEY_CONTENT" -ForegroundColor Yellow
        Write-Host "Value:" -ForegroundColor Yellow
        Write-Host $apiKeyBase64 -ForegroundColor Gray
        Write-Host ""
        
        $apiKeyBase64 | Out-File -FilePath "apikey_base64.txt" -Encoding UTF8
        Write-Host "Saved to: apikey_base64.txt" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "ERROR: Could not read API key file" -ForegroundColor Red
        Write-Host $_ -ForegroundColor Red
    }
} else {
    Write-Host "SKIPPED: You can convert this manually later" -ForegroundColor Yellow
    Write-Host ""
}

# Step 5: GitHub Secrets Summary
Write-Host "[Step 5/6] GitHub Secrets Summary" -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to: GitHub repository -> Settings -> Secrets -> Actions" -ForegroundColor White
Write-Host ""
Write-Host "Add these 7 secrets:" -ForegroundColor White
Write-Host ""

$secrets = @(
    @{Name="BUILD_CERTIFICATE_BASE64"; Description="Base64 of .p12 certificate"; File="cert_base64.txt"},
    @{Name="P12_PASSWORD"; Description="Password for .p12 certificate"; File="(enter manually)"},
    @{Name="BUILD_PROVISION_PROFILE_BASE64"; Description="Base64 of .mobileprovision"; File="profile_base64.txt"},
    @{Name="KEYCHAIN_PASSWORD"; Description="Any random password"; File="(enter manually)"},
    @{Name="APP_STORE_CONNECT_API_KEY_ID"; Description="Key ID from App Store Connect"; File="(from website)"},
    @{Name="APP_STORE_CONNECT_API_ISSUER_ID"; Description="Issuer ID from App Store Connect"; File="(from website)"},
    @{Name="APP_STORE_CONNECT_API_KEY_CONTENT"; Description="Base64 of .p8 key"; File="apikey_base64.txt"}
)

foreach ($secret in $secrets) {
    Write-Host "  - $($secret.Name)" -ForegroundColor Yellow
    Write-Host "    $($secret.Description)" -ForegroundColor Gray
    Write-Host "    Value from: $($secret.File)" -ForegroundColor Gray
    Write-Host ""
}

# Step 6: Next Steps
Write-Host "[Step 6/6] Next Steps" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Add all 7 GitHub Secrets" -ForegroundColor White
Write-Host "2. Commit and push your changes" -ForegroundColor White
Write-Host "3. GitHub Actions will build automatically" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generated files (delete after uploading to GitHub):" -ForegroundColor White
if (Test-Path "cert_base64.txt") {
    Write-Host "  - cert_base64.txt" -ForegroundColor Gray
}
if (Test-Path "profile_base64.txt") {
    Write-Host "  - profile_base64.txt" -ForegroundColor Gray
}
if (Test-Path "apikey_base64.txt") {
    Write-Host "  - apikey_base64.txt" -ForegroundColor Gray
}
Write-Host ""
Write-Host "WARNING: Delete these files after uploading to GitHub!" -ForegroundColor Red
Write-Host ""
