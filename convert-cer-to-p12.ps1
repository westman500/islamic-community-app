# Convert Apple Certificate (.cer) to .p12 for GitHub Actions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Convert .cer to .p12" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for private key
if (-not (Test-Path "ios_distribution.key")) {
    Write-Host "ERROR: ios_distribution.key not found!" -ForegroundColor Red
    Write-Host "You need to run generate-csr.ps1 first" -ForegroundColor Red
    exit
}

# Check for OpenSSL
$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
    Write-Host "ERROR: OpenSSL not found" -ForegroundColor Red
    Write-Host "Install from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Cyan
    exit
}

Write-Host "After creating your certificate on Apple Developer Portal," -ForegroundColor White
Write-Host "download the .cer file and place it in this folder." -ForegroundColor White
Write-Host ""

$cerFile = Read-Host "Enter the name of your .cer file (or full path)"

if (-not (Test-Path $cerFile)) {
    Write-Host "ERROR: Certificate file not found: $cerFile" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Converting certificate..." -ForegroundColor Yellow

# Convert .cer to .pem
openssl x509 -in $cerFile -inform DER -out ios_distribution.pem -outform PEM

# Create .p12 from .pem and private key
Write-Host ""
Write-Host "You need to set a password for the .p12 file" -ForegroundColor Yellow
Write-Host "Remember this password - you'll need it for GitHub Secrets" -ForegroundColor Yellow
Write-Host ""

openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem

if (Test-Path "ios_distribution.p12") {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Created: ios_distribution.p12" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Now run the setup script to convert to base64:" -ForegroundColor Yellow
    Write-Host "  .\setup-ios-github-actions.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "When prompted, provide:" -ForegroundColor White
    Write-Host "  Certificate path: ios_distribution.p12" -ForegroundColor Gray
    Write-Host "  Password: [the password you just set]" -ForegroundColor Gray
    Write-Host ""
    
    explorer.exe $PSScriptRoot
} else {
    Write-Host "ERROR: Failed to create .p12 file" -ForegroundColor Red
}
