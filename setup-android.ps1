# Quick Android Setup Script
# Run this script to check and download required tools

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Islamic Community - Android Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Java is installed
Write-Host "1. Checking Java..." -ForegroundColor Yellow
$javaInstalled = $false
$javaCheck = Get-Command java -ErrorAction SilentlyContinue
if ($javaCheck) {
    Write-Host "   ✓ Java is installed" -ForegroundColor Green
    $javaInstalled = $true
} else {
    Write-Host "   ✗ Java is NOT installed" -ForegroundColor Red
    Write-Host "   Download from: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
    Write-Host "   Or install via: choco install openjdk17" -ForegroundColor Yellow
}

Write-Host ""

# Check JAVA_HOME
Write-Host "2. Checking JAVA_HOME..." -ForegroundColor Yellow
if ($env:JAVA_HOME) {
    Write-Host "   ✓ JAVA_HOME is set: $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "   ✗ JAVA_HOME is NOT set" -ForegroundColor Red
    Write-Host "   Set it to your Java installation directory" -ForegroundColor Yellow
}

Write-Host ""

# Check Android SDK
Write-Host "3. Checking Android SDK..." -ForegroundColor Yellow
if ($env:ANDROID_HOME) {
    Write-Host "   ✓ ANDROID_HOME is set: $env:ANDROID_HOME" -ForegroundColor Green
    
    # Check if ADB exists
    $adbPath = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        Write-Host "   ✓ Android SDK tools found" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Android SDK tools not found in ANDROID_HOME" -ForegroundColor Red
    }
} else {
    Write-Host "   ✗ ANDROID_HOME is NOT set" -ForegroundColor Red
    Write-Host "   Install Android Studio from: https://developer.android.com/studio" -ForegroundColor Yellow
    Write-Host "   Then set ANDROID_HOME to SDK location" -ForegroundColor Yellow
}

Write-Host ""

# Check if android folder exists
Write-Host "4. Checking Capacitor Android project..." -ForegroundColor Yellow
if (Test-Path "android") {
    Write-Host "   ✓ Android project exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ Android project not found" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

if ($javaInstalled -and $env:JAVA_HOME -and $env:ANDROID_HOME) {
    Write-Host "✓ All prerequisites are installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. npm run build" -ForegroundColor White
    Write-Host "  2. npx cap sync android" -ForegroundColor White
    Write-Host "  3. cd android" -ForegroundColor White
    Write-Host "  4. .\gradlew.bat assembleDebug" -ForegroundColor White
    Write-Host ""
    Write-Host "APK will be at: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
} else {
    Write-Host "⚠ Prerequisites missing!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install the following:" -ForegroundColor Yellow
    
    if (-not $javaInstalled) {
        Write-Host ""
        Write-Host "→ Java JDK 17+" -ForegroundColor White
        Write-Host "  Download: https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Gray
        Write-Host "  Or run: choco install openjdk17" -ForegroundColor Gray
    }
    
    if (-not $env:ANDROID_HOME) {
        Write-Host ""
        Write-Host "→ Android Studio" -ForegroundColor White
        Write-Host "  Download: https://developer.android.com/studio" -ForegroundColor Gray
        Write-Host "  Install SDK during setup" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "After installation:" -ForegroundColor Yellow
    Write-Host "  1. Set JAVA_HOME environment variable" -ForegroundColor White
    Write-Host "  2. Set ANDROID_HOME environment variable" -ForegroundColor White
    Write-Host "  3. Add to PATH:" -ForegroundColor White
    Write-Host "     - %JAVA_HOME%\bin" -ForegroundColor Gray
    Write-Host "     - %ANDROID_HOME%\platform-tools" -ForegroundColor Gray
    Write-Host "  4. Restart PowerShell" -ForegroundColor White
    Write-Host "  5. Run this script again" -ForegroundColor White
}

Write-Host ""
Write-Host "For detailed instructions, see ANDROID_APK_BUILD.md" -ForegroundColor Cyan
Write-Host ""
