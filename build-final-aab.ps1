# Build final AAB with all fixes
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD ANDROID AAB - ALL FIXES APPLIED" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ FIXES INCLUDED:" -ForegroundColor Green
Write-Host "   1. Edge-to-edge support for Android 15" -ForegroundColor White
Write-Host "   2. iOS icons copied to Android (all sizes)" -ForegroundColor White
Write-Host "   3. Smile ID integration" -ForegroundColor White
Write-Host "   4. Push notifications" -ForegroundColor White
Write-Host "   5. Location permissions fix" -ForegroundColor White
Write-Host "   6. Real-time account deletion" -ForegroundColor White
Write-Host "   7. Livestream improvements`n" -ForegroundColor White

# Free up disk space first
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Remove-Item -Path "android\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\app\build\intermediates" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\gradle*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Cleaned build cache`n" -ForegroundColor Green

# Build
Write-Host "🔨 Building AAB (this may take 5-10 minutes)..." -ForegroundColor Cyan
Set-Location android
.\gradlew.bat clean bundleRelease

if ($LASTEXITCODE -eq 0) {
    Set-Location ..
    $timestamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
    $aabName = "masjid-wallet-FINAL-$timestamp.aab"
    New-Item -ItemType Directory -Path "app-release-aab" -Force | Out-Null
    Copy-Item "android\app\build\outputs\bundle\release\app-release.aab" -Destination "app-release-aab\$aabName"
    
    Write-Host "`n✅ AAB BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "   Location: app-release-aab\$aabName" -ForegroundColor Cyan
    
    $aabFile = Get-Item "app-release-aab\$aabName"
    Write-Host "   Size: $([math]::Round($aabFile.Length/1MB, 2)) MB`n" -ForegroundColor Cyan
    
    explorer.exe /select,"$PWD\app-release-aab\$aabName"
} else {
    Write-Host "`n❌ Build failed. Check error messages above." -ForegroundColor Red
    Write-Host "   Try freeing up disk space and run this script again.`n" -ForegroundColor Yellow
}

Set-Location ..
