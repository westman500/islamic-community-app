# Build iOS app for simulator testing
Write-Host "Building iOS app for simulator..." -ForegroundColor Cyan

# Check if on macOS (this script needs to run on Mac for simulator builds)
if ($env:OS -eq "Windows_NT") {
    Write-Host "`n⚠️  This script must be run on macOS to build for iOS Simulator" -ForegroundColor Yellow
    Write-Host "`nTo build for simulator on Mac:" -ForegroundColor White
    Write-Host "1. Clone your repo on a Mac" -ForegroundColor Gray
    Write-Host "2. Run: npm install && npm run build" -ForegroundColor Gray
    Write-Host "3. Run: npx cap sync ios" -ForegroundColor Gray
    Write-Host "4. Run: xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build" -ForegroundColor Gray
    Write-Host "5. Find the .app file in ios/build/Build/Products/Debug-iphonesimulator/" -ForegroundColor Gray
    Write-Host "6. Zip it: cd ios/build/Build/Products/Debug-iphonesimulator && zip -r App.zip App.app" -ForegroundColor Gray
    Write-Host "`nAlternatively, use this existing .ipa file with TestFlight for real device testing." -ForegroundColor Green
    exit 1
}

# If on Mac, build for simulator
Set-Location ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -derivedDataPath ../build

# Create zip
$appPath = "../build/Build/Products/Debug-iphonesimulator/App.app"
if (Test-Path $appPath) {
    Compress-Archive -Path $appPath -DestinationPath "../../build-latest/masjid-ios-simulator.zip" -Force
    Write-Host "`n✅ Simulator build created: build-latest/masjid-ios-simulator.zip" -ForegroundColor Green
} else {
    Write-Host "`n❌ Build failed - .app not found" -ForegroundColor Red
}
