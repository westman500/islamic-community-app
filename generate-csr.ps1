# Generate Certificate Signing Request (CSR) for iOS on Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  iOS CSR Generator (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if OpenSSL is available
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if (-not $openssl) {
    Write-Host "OpenSSL not found. Installing via Chocolatey..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install OpenSSL manually" -ForegroundColor White
    Write-Host "  Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Cyan
    Write-Host "  Install 'Win64 OpenSSL v3.x.x Light'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 2: Use Chocolatey (if installed)" -ForegroundColor White
    Write-Host "  Run: choco install openssl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installing OpenSSL, run this script again." -ForegroundColor Yellow
    Write-Host ""
    exit
}

Write-Host "OpenSSL found: $($openssl.Source)" -ForegroundColor Green
Write-Host ""

# Get user information
Write-Host "Enter your information for the certificate:" -ForegroundColor Yellow
Write-Host ""

$email = Read-Host "Your email address (Apple ID)"
$name = Read-Host "Your name or company name"
$country = Read-Host "Country code (e.g., US, NG, UK)"

Write-Host ""
Write-Host "Generating private key and CSR..." -ForegroundColor Yellow

# Generate private key
openssl genrsa -out ios_distribution.key 2048

# Generate CSR
openssl req -new -key ios_distribution.key -out CertificateSigningRequest.certSigningRequest -subj "/emailAddress=$email/CN=$name/C=$country"

if (Test-Path "CertificateSigningRequest.certSigningRequest") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor White
    Write-Host "  1. CertificateSigningRequest.certSigningRequest" -ForegroundColor Cyan
    Write-Host "     (Upload this to Apple Developer Portal)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. ios_distribution.key" -ForegroundColor Cyan
    Write-Host "     (Keep this PRIVATE - you'll need it to create .p12)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://developer.apple.com/account/resources/certificates" -ForegroundColor White
    Write-Host "  2. Click '+' to create new certificate" -ForegroundColor White
    Write-Host "  3. Select 'iOS Distribution (App Store and Ad Hoc)'" -ForegroundColor White
    Write-Host "  4. Upload: CertificateSigningRequest.certSigningRequest" -ForegroundColor White
    Write-Host "  5. Download the certificate (.cer file)" -ForegroundColor White
    Write-Host ""
    Write-Host "After downloading the .cer file, run:" -ForegroundColor Yellow
    Write-Host "  .\convert-cer-to-p12.ps1" -ForegroundColor Cyan
    Write-Host ""
    
    # Open folder
    explorer.exe $PSScriptRoot
} else {
    Write-Host "ERROR: Failed to generate CSR" -ForegroundColor Red
    Write-Host "Please check that OpenSSL is installed correctly" -ForegroundColor Red
}
