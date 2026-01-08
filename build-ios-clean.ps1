#!/usr/bin/env pwsh
# Clean iOS Build Script - Clears all caches before building
# This ensures your latest changes appear in the IPA

Write-Host "iOS Clean Build Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Step 1: Clean Node/npm cache
Write-Host "Step 1: Cleaning Node.js build artifacts..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "  OK: Removed dist folder" -ForegroundColor Green
}
if (Test-Path ".vite") {
    Remove-Item -Recurse -Force ".vite"
    Write-Host "  OK: Removed .vite cache" -ForegroundColor Green
}
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
    Write-Host "  OK: Removed node_modules/.vite cache" -ForegroundColor Green
}

# Step 2: Clean Capacitor iOS cache
Write-Host "`nStep 2: Cleaning Capacitor iOS cache..." -ForegroundColor Yellow
if (Test-Path "ios/App/App/public") {
    Remove-Item -Recurse -Force "ios/App/App/public"
    Write-Host "  OK: Removed ios/App/App/public" -ForegroundColor Green
}
if (Test-Path "ios/App/Pods") {
    Remove-Item -Recurse -Force "ios/App/Pods"
    Write-Host "  OK: Removed Pods folder" -ForegroundColor Green
}
if (Test-Path "ios/App/Podfile.lock") {
    Remove-Item -Force "ios/App/Podfile.lock"
    Write-Host "  OK: Removed Podfile.lock" -ForegroundColor Green
}

# Step 3: Clean Xcode derived data (if accessible)
Write-Host "`nStep 3: Cleaning Xcode build artifacts..." -ForegroundColor Yellow
if (Test-Path "ios/App/build") {
    Remove-Item -Recurse -Force "ios/App/build"
    Write-Host "  OK: Removed build folder" -ForegroundColor Green
}
if (Test-Path "ios/App/App.xcworkspace/xcuserdata") {
    Remove-Item -Recurse -Force "ios/App/App.xcworkspace/xcuserdata"
    Write-Host "  OK: Removed xcuserdata" -ForegroundColor Green
}
if (Test-Path "ios/App/App.xcodeproj/xcuserdata") {
    Remove-Item -Recurse -Force "ios/App/App.xcodeproj/xcuserdata"
    Write-Host "  OK: Removed project xcuserdata" -ForegroundColor Green
}

# Step 4: Fresh build
Write-Host "`nStep 4: Building fresh web assets..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Web build completed" -ForegroundColor Green

# Step 5: Sync to iOS with inline source maps
Write-Host "`nStep 5: Syncing to iOS (this may take a minute)..." -ForegroundColor Yellow
npx cap sync ios --inline
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: iOS sync completed" -ForegroundColor Green

# Step 6: Display summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Clean build complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Web assets built: $(Get-Date (Get-Item 'dist').LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "iOS public synced: $(Get-Date (Get-Item 'ios/App/App/public').LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. On Mac: Open Xcode: cd ios/App && xed ." -ForegroundColor Gray
Write-Host "  2. Product > Clean Build Folder" -ForegroundColor Gray
Write-Host "  3. Product > Archive" -ForegroundColor Gray
Write-Host "  4. Distribute IPA" -ForegroundColor Gray
Write-Host ""
Write-Host "Or use GitHub Actions:" -ForegroundColor Cyan
Write-Host "  git add -A && git commit -m 'Clean build' && git push" -ForegroundColor Gray
Write-Host ""
