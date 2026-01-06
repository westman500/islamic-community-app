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
Write-Host "✓ Capacitor sync completed" -ForegroundColor Green
Write-Host ""

# Step 2: Build APK
Write-Host "[Step 2/4] Building APK - this may take 20-30 minutes..." -ForegroundColor Yellow
cd android
.\gradlew assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: APK build failed!" -ForegroundColor Red
    cd ..
    exit 1
}
cd ..
Write-Host "✓ APK build completed" -ForegroundColor Green
Write-Host ""

# Step 3: Copy APK with timestamp
Write-Host "[Step 3/4] Copying APK to distribution folder..." -ForegroundColor Yellow
$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
$apkName = "masjid-wallet-$timestamp.apk"
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "app-debug-apk\$apkName"
Write-Host "✓ APK copied as: $apkName" -ForegroundColor Green
Write-Host ""

# Step 4: Open folder
Write-Host "[Step 4/4] Opening APK folder..." -ForegroundColor Yellow
explorer.exe "$PSScriptRoot\app-debug-apk"
Write-Host "✓ Folder opened" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!" -ForegroundColor Green
Write-Host "  APK Location: app-debug-apk\$apkName" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
