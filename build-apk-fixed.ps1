# Masjid App - APK Build Script
# Complete build process for Android APK

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Masjid App - APK Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Sync Capacitor
Write-Host "[Step 1/4] Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Success: Capacitor sync completed" -ForegroundColor Green
Write-Host ""

# Step 2: Build APK
Write-Host "[Step 2/4] Building APK - this may take 20-30 minutes..." -ForegroundColor Yellow
Set-Location android
& .\gradlew assembleDebug
$buildResult = $LASTEXITCODE
Set-Location ..

if ($buildResult -ne 0) {
    Write-Host "Error: APK build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Success: APK build completed" -ForegroundColor Green
Write-Host ""

# Step 3: Copy APK with timestamp
Write-Host "[Step 3/4] Copying APK to distribution folder..." -ForegroundColor Yellow
$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
$apkName = "masjid-wallet-$timestamp.apk"
$sourcePath = "android\app\build\outputs\apk\debug\app-debug.apk"
$destPath = "app-debug-apk\$apkName"

if (Test-Path $sourcePath) {
    Copy-Item $sourcePath -Destination $destPath -Force
    Write-Host "Success: APK copied as: $apkName" -ForegroundColor Green
} else {
    Write-Host "Error: APK file not found at $sourcePath" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Open folder
Write-Host "[Step 4/4] Opening APK folder..." -ForegroundColor Yellow
explorer.exe "$PSScriptRoot\app-debug-apk"
Write-Host "Success: Folder opened" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "  APK Location: app-debug-apk\$apkName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
