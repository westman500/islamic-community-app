# Clean up old APKs and IPAs to free disk space
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CLEANING OLD BUILD FILES" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$totalFreed = 0

# Clean old APKs
Write-Host "1. Removing old APK files..." -ForegroundColor Yellow
$apkFiles = Get-ChildItem -Path "app-debug-apk" -Filter "*.apk" -ErrorAction SilentlyContinue
if ($apkFiles) {
    $apkSize = ($apkFiles | Measure-Object -Property Length -Sum).Sum
    Remove-Item "app-debug-apk\*" -Force
    Write-Host "   Removed $($apkFiles.Count) APK files" -ForegroundColor Green
    Write-Host "   Freed: $([math]::Round($apkSize/1MB, 2)) MB" -ForegroundColor Cyan
    $totalFreed += $apkSize
}

# Clean old AABs (keep only the latest)
Write-Host "`n2. Cleaning old AAB files..." -ForegroundColor Yellow
$aabFiles = Get-ChildItem -Path "app-release-aab" -Filter "*.aab" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime
if ($aabFiles -and $aabFiles.Count -gt 1) {
    $oldAabs = $aabFiles | Select-Object -SkipLast 1
    $aabSize = ($oldAabs | Measure-Object -Property Length -Sum).Sum
    $oldAabs | Remove-Item -Force
    Write-Host "   Kept latest AAB, removed $($oldAabs.Count) old files" -ForegroundColor Green
    Write-Host "   Freed: $([math]::Round($aabSize/1MB, 2)) MB" -ForegroundColor Cyan
    $totalFreed += $aabSize
} else {
    Write-Host "   Only 1 AAB found, keeping it" -ForegroundColor Green
}

# Clean old IPAs (keep only App-LATEST)
Write-Host "`n3. Removing old IPA files..." -ForegroundColor Yellow
$oldIpas = Get-ChildItem -Path . -Filter "*.ipa" | Where-Object { $_.Name -notlike "App-LATEST*" }
if ($oldIpas) {
    $ipaSize = ($oldIpas | Measure-Object -Property Length -Sum).Sum
    $oldIpas | Remove-Item -Force
    Write-Host "   Removed $($oldIpas.Count) old IPA files" -ForegroundColor Green
    Write-Host "   Freed: $([math]::Round($ipaSize/1MB, 2)) MB" -ForegroundColor Cyan
    $totalFreed += $ipaSize
}

# Clean downloaded iOS artifacts
Write-Host "`n4. Removing downloaded iOS artifacts..." -ForegroundColor Yellow
$iosArtifacts = Get-ChildItem -Path . -Directory -Filter "masjid-ios-*" -ErrorAction SilentlyContinue
if ($iosArtifacts) {
    foreach ($artifact in $iosArtifacts) {
        $artifactSize = (Get-ChildItem $artifact.FullName -Recurse | Measure-Object -Property Length -Sum).Sum
        Remove-Item $artifact.FullName -Recurse -Force
        $totalFreed += $artifactSize
    }
    Write-Host "   Removed $($iosArtifacts.Count) artifact folders" -ForegroundColor Green
}

# Clean Gradle build cache
Write-Host "`n5. Cleaning Gradle build cache..." -ForegroundColor Yellow
if (Test-Path "android\app\build") {
    $buildSize = (Get-ChildItem "android\app\build" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Remove-Item "android\app\build" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Cleaned build directory" -ForegroundColor Green
    Write-Host "   Freed: $([math]::Round($buildSize/1MB, 2)) MB" -ForegroundColor Cyan
    $totalFreed += $buildSize
}

# Clean Gradle cache
if (Test-Path "android\.gradle") {
    $gradleSize = (Get-ChildItem "android\.gradle" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Remove-Item "android\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Cleaned .gradle cache" -ForegroundColor Green
    Write-Host "   Freed: $([math]::Round($gradleSize/1MB, 2)) MB" -ForegroundColor Cyan
    $totalFreed += $gradleSize
}

# Clean npm build
Write-Host "`n6. Cleaning web build artifacts..." -ForegroundColor Yellow
if (Test-Path "dist") {
    $distSize = (Get-ChildItem "dist" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    Remove-Item "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Cleaned dist directory" -ForegroundColor Green
    Write-Host "   Freed: $([math]::Round($distSize/1MB, 2)) MB" -ForegroundColor Cyan
    $totalFreed += $distSize
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total space freed: $([math]::Round($totalFreed/1MB, 2)) MB" -ForegroundColor Yellow
Write-Host "                   $([math]::Round($totalFreed/1GB, 2)) GB`n" -ForegroundColor Yellow

Write-Host "Remaining files:" -ForegroundColor White
Write-Host "  Latest AAB: $(if (Test-Path 'app-release-aab\*.aab') { (Get-ChildItem 'app-release-aab\*.aab' | Select-Object -First 1).Name } else { 'None' })" -ForegroundColor Cyan
Write-Host "  Latest IPA: $(if (Test-Path 'App-LATEST*.ipa') { (Get-ChildItem 'App-LATEST*.ipa' | Select-Object -First 1).Name } else { 'None' })`n" -ForegroundColor Cyan
