#!/usr/bin/env pwsh
# Check iOS Cache Status - Verify if changes are synced

Write-Host "iOS Cache Status Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

function Get-FileAge {
    param($Path)
    if (Test-Path $Path) {
        $age = (Get-Date) - (Get-Item $Path).LastWriteTime
        $modified = (Get-Item $Path).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
        return @{
            Exists = $true
            Modified = $modified
            Age = "{0}h {1}m ago" -f [int]$age.TotalHours, [int]$age.Minutes
        }
    }
    return @{ Exists = $false }
}

# Check dist folder
Write-Host "Web Build (dist/):" -ForegroundColor Yellow
$distInfo = Get-FileAge "dist"
if ($distInfo.Exists) {
    Write-Host "  Modified: $($distInfo.Modified)" -ForegroundColor Green
    Write-Host "  Age: $($distInfo.Age)" -ForegroundColor Gray
    
    if (Test-Path "dist/index.html") {
        $indexInfo = Get-FileAge "dist/index.html"
        Write-Host "  index.html: $($indexInfo.Modified)" -ForegroundColor Gray
    }
    $jsFiles = Get-ChildItem "dist/assets/*.js" -ErrorAction SilentlyContinue
    if ($jsFiles) {
        Write-Host "  JS bundles: $($jsFiles.Count) files" -ForegroundColor Gray
    }
} else {
    Write-Host "  NOT FOUND - Need to run: npm run build" -ForegroundColor Red
}

# Check iOS public folder
Write-Host "`niOS App Bundle (ios/App/App/public/):" -ForegroundColor Yellow
$publicInfo = Get-FileAge "ios/App/App/public"
if ($publicInfo.Exists) {
    Write-Host "  Modified: $($publicInfo.Modified)" -ForegroundColor Green
    Write-Host "  Age: $($publicInfo.Age)" -ForegroundColor Gray
    
    if (Test-Path "ios/App/App/public/index.html") {
        $iosIndexInfo = Get-FileAge "ios/App/App/public/index.html"
        Write-Host "  index.html: $($iosIndexInfo.Modified)" -ForegroundColor Gray
    }
    
    if ($distInfo.Exists) {
        $distTime = (Get-Item "dist").LastWriteTime
        $publicTime = (Get-Item "ios/App/App/public").LastWriteTime
        $diff = ($publicTime - $distTime).TotalMinutes
        
        if ($diff -lt -1) {
            Write-Host "  WARNING: iOS bundle is OLDER than web build!" -ForegroundColor Red
            Write-Host "     Need to run: npx cap sync ios" -ForegroundColor Yellow
        } elseif ($diff -gt 1) {
            Write-Host "  OK: iOS bundle is up-to-date" -ForegroundColor Green
        } else {
            Write-Host "  OK: iOS bundle and web build are in sync" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  NOT FOUND - Need to run: npx cap sync ios" -ForegroundColor Red
}

# Check cache folders
Write-Host "`nCache Folders:" -ForegroundColor Yellow
$caches = @{
    ".vite" = ".vite/"
    "node .vite" = "node_modules/.vite/"
    "iOS Pods" = "ios/App/Pods/"
    "iOS build" = "ios/App/build/"
}

foreach ($cache in $caches.GetEnumerator()) {
    if (Test-Path $cache.Value) {
        $cacheInfo = Get-FileAge $cache.Value
        Write-Host "  $($cache.Key): $($cacheInfo.Age)" -ForegroundColor Gray
    } else {
        Write-Host "  $($cache.Key): Not present" -ForegroundColor DarkGray
    }
}

# Check latest IPA
Write-Host "`nLatest IPA:" -ForegroundColor Yellow
$latestIpa = Get-ChildItem "*.ipa" -ErrorAction SilentlyContinue | 
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestIpa) {
    $ipaInfo = Get-FileAge $latestIpa.FullName
    Write-Host "  File: $($latestIpa.Name)" -ForegroundColor Green
    Write-Host "  Modified: $($ipaInfo.Modified)" -ForegroundColor Green
    Write-Host "  Age: $($ipaInfo.Age)" -ForegroundColor Gray
    
    if ($publicInfo.Exists) {
        $ipaTime = $latestIpa.LastWriteTime
        $publicTime = (Get-Item "ios/App/App/public").LastWriteTime
        $diff = ($ipaTime - $publicTime).TotalMinutes
        
        if ($diff -lt -1) {
            Write-Host "  WARNING: IPA is OLDER than iOS bundle!" -ForegroundColor Red
            Write-Host "     Need to rebuild IPA on Mac or via GitHub Actions" -ForegroundColor Yellow
        } else {
            Write-Host "  OK: IPA includes current iOS bundle" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  No IPA files found" -ForegroundColor Red
}

# Final recommendation
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Recommendations:" -ForegroundColor Cyan
Write-Host ""

$needsAction = $false

if (-not $distInfo.Exists) {
    Write-Host "  1. Build web assets: npm run build" -ForegroundColor Yellow
    $needsAction = $true
} elseif (-not $publicInfo.Exists) {
    Write-Host "  1. Sync to iOS: npx cap sync ios" -ForegroundColor Yellow
    $needsAction = $true
} elseif ($publicInfo.Exists -and $distInfo.Exists) {
    $distTime = (Get-Item "dist").LastWriteTime
    $publicTime = (Get-Item "ios/App/App/public").LastWriteTime
    if (($publicTime - $distTime).TotalMinutes -lt -1) {
        Write-Host "  1. Re-sync to iOS: npx cap sync ios" -ForegroundColor Yellow
        $needsAction = $true
    }
}

if ($needsAction) {
    Write-Host ""
    Write-Host "  Or run clean build: .\build-ios-clean.ps1" -ForegroundColor Cyan
} else {
    Write-Host "  Everything looks synced!" -ForegroundColor Green
    Write-Host "  If changes still missing, run: .\build-ios-clean.ps1" -ForegroundColor Gray
}

Write-Host ""
