#!/usr/bin/env pwsh
# Compare source and build to verify changes are compiled

Write-Host "Source vs Build Verification" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get a checksum of key source files
function Get-SourceHash {
    $sourceFiles = @()
    if (Test-Path "src/main.tsx") { $sourceFiles += "src/main.tsx" }
    if (Test-Path "src/App.tsx") { $sourceFiles += "src/App.tsx" }
    
    $allSource = Get-ChildItem -Path "src" -Recurse -Filter "*.tsx","*.ts" | 
        Sort-Object FullName | 
        Select-Object -First 10
    
    $totalSize = ($allSource | Measure-Object -Property Length -Sum).Sum
    $lastModified = ($allSource | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
    
    return @{
        FileCount = $allSource.Count
        TotalSize = $totalSize
        LastModified = $lastModified
    }
}

# Check source files
Write-Host "Source Code (src/):" -ForegroundColor Yellow
$srcStats = Get-SourceHash
Write-Host "  Files checked: $($srcStats.FileCount)" -ForegroundColor Gray
Write-Host "  Total size: $([math]::Round($srcStats.TotalSize/1KB, 1)) KB" -ForegroundColor Gray
Write-Host "  Last modified: $($srcStats.LastModified.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray

# Check dist
Write-Host "`nBuild Output (dist/):" -ForegroundColor Yellow
if (Test-Path "dist") {
    $distFiles = Get-ChildItem -Path "dist" -Recurse -File
    $distSize = ($distFiles | Measure-Object -Property Length -Sum).Sum
    $distModified = (Get-Item "dist").LastWriteTime
    
    Write-Host "  Files: $($distFiles.Count)" -ForegroundColor Gray
    Write-Host "  Total size: $([math]::Round($distSize/1KB, 1)) KB" -ForegroundColor Gray
    Write-Host "  Built: $($distModified.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
    
    # Check if dist is older than source
    $age = ($srcStats.LastModified - $distModified).TotalMinutes
    if ($age -gt 1) {
        Write-Host "`n  WARNING: Build is OLDER than source code!" -ForegroundColor Red
        Write-Host "  Source changed: $([math]::Round($age, 0)) minutes after last build" -ForegroundColor Yellow
        Write-Host "  ACTION REQUIRED: npm run build" -ForegroundColor Yellow
    } else {
        Write-Host "  OK: Build is up-to-date with source" -ForegroundColor Green
    }
    
    # Show JS bundle sizes
    Write-Host "`n  JavaScript Bundles:" -ForegroundColor Gray
    $jsBundles = Get-ChildItem "dist/assets/*.js" -ErrorAction SilentlyContinue
    if ($jsBundles) {
        foreach ($bundle in $jsBundles) {
            $sizeKB = [math]::Round($bundle.Length/1KB, 1)
            Write-Host "    - $($bundle.Name): ${sizeKB} KB" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "  NOT FOUND" -ForegroundColor Red
    Write-Host "  ACTION REQUIRED: npm run build" -ForegroundColor Yellow
}

# Check iOS bundle
Write-Host "`niOS Bundle (ios/App/App/public/):" -ForegroundColor Yellow
if (Test-Path "ios/App/App/public") {
    $iosFiles = Get-ChildItem -Path "ios/App/App/public" -Recurse -File
    $iosSize = ($iosFiles | Measure-Object -Property Length -Sum).Sum
    $iosModified = (Get-Item "ios/App/App/public").LastWriteTime
    
    Write-Host "  Files: $($iosFiles.Count)" -ForegroundColor Gray
    Write-Host "  Total size: $([math]::Round($iosSize/1KB, 1)) KB" -ForegroundColor Gray
    Write-Host "  Synced: $($iosModified.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
    
    # Compare with dist
    if (Test-Path "dist") {
        $distModified = (Get-Item "dist").LastWriteTime
        $syncAge = ($distModified - $iosModified).TotalMinutes
        
        if ($syncAge -gt 1) {
            Write-Host "`n  WARNING: iOS bundle is OLDER than dist!" -ForegroundColor Red
            Write-Host "  Dist changed: $([math]::Round($syncAge, 0)) minutes after last sync" -ForegroundColor Yellow
            Write-Host "  ACTION REQUIRED: npx cap sync ios" -ForegroundColor Yellow
        } else {
            Write-Host "  OK: iOS bundle matches dist" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  NOT FOUND" -ForegroundColor Red
    Write-Host "  ACTION REQUIRED: npx cap sync ios" -ForegroundColor Yellow
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host ""

# Decision tree
$needsClean = $false

if (-not (Test-Path "dist")) {
    Write-Host "  Step 1: npm run build" -ForegroundColor Yellow
    $needsClean = $true
} elseif (($srcStats.LastModified - (Get-Item "dist").LastWriteTime).TotalMinutes -gt 1) {
    Write-Host "  Step 1: npm run build (source changed)" -ForegroundColor Yellow
    $needsClean = $true
}

if (-not (Test-Path "ios/App/App/public")) {
    Write-Host "  Step 2: npx cap sync ios" -ForegroundColor Yellow
    $needsClean = $true
} elseif ((Test-Path "dist") -and (((Get-Item "dist").LastWriteTime - (Get-Item "ios/App/App/public").LastWriteTime).TotalMinutes -gt 1)) {
    Write-Host "  Step 2: npx cap sync ios (dist changed)" -ForegroundColor Yellow
    $needsClean = $true
}

if ($needsClean) {
    Write-Host ""
    Write-Host "  RECOMMENDED: Run .\build-ios-clean.ps1" -ForegroundColor Cyan
    Write-Host "  This will clear all caches and rebuild from scratch" -ForegroundColor Gray
} else {
    Write-Host "  All timestamps look correct!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  If changes still don't appear in IPA, the issue may be:" -ForegroundColor Yellow
    Write-Host "    1. Vite/Node module cache: Run .\build-ios-clean.ps1" -ForegroundColor Gray
    Write-Host "    2. Xcode derived data cache (clear on Mac)" -ForegroundColor Gray
    Write-Host "    3. Changes not saved before building" -ForegroundColor Gray
}

Write-Host ""
