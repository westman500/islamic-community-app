# Extract and create debug symbols from existing AAB
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CREATING DEBUG SYMBOLS FOR PLAY STORE" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$aabPath = "android\app\build\outputs\bundle\release\app-release.aab"
$tempDir = "android\app\build\temp-symbols"
$outputDir = "android\app\build\outputs\native-debug-symbols\release"
$outputZip = "$outputDir\native-debug-symbols.zip"

# Create directories
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

Write-Host "1. Extracting AAB file..." -ForegroundColor Yellow
# AAB is a zip file, extract it
Expand-Archive -Path $aabPath -DestinationPath $tempDir -Force

Write-Host "2. Finding native libraries..." -ForegroundColor Yellow
$soFiles = Get-ChildItem -Path $tempDir -Filter "*.so" -Recurse

if ($soFiles.Count -eq 0) {
    Write-Host "   No native libraries found in AAB" -ForegroundColor Yellow
    Write-Host "   This is normal for Capacitor apps without custom native code`n" -ForegroundColor Cyan
    
    # Create empty symbols file for Play Store
    Write-Host "3. Creating empty symbols file for Play Store..." -ForegroundColor Yellow
    $readmePath = "$tempDir\README.txt"
    "This app does not contain custom native code requiring debug symbols." | Out-File $readmePath
    Compress-Archive -Path $readmePath -DestinationPath $outputZip -Force
} else {
    Write-Host "   Found $($soFiles.Count) native library files" -ForegroundColor Green
    
    Write-Host "3. Creating symbols zip..." -ForegroundColor Yellow
    # Copy .so files maintaining structure
    $libDir = "$tempDir\lib"
    Compress-Archive -Path "$libDir\*" -DestinationPath $outputZip -Force
}

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force

if (Test-Path $outputZip) {
    $zipFile = Get-Item $outputZip
    Write-Host "`n✅ Debug symbols created successfully!" -ForegroundColor Green
    Write-Host "   Location: $outputZip" -ForegroundColor Cyan
    Write-Host "   Size: $([math]::Round($zipFile.Length/1KB, 2)) KB" -ForegroundColor Cyan
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  UPLOAD TO GOOGLE PLAY CONSOLE" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "1. Go to your app in Play Console" -ForegroundColor White
    Write-Host "2. Navigate to the release with the warning" -ForegroundColor White
    Write-Host "3. Click 'Upload debug symbols'" -ForegroundColor White
    Write-Host "4. Upload: native-debug-symbols.zip`n" -ForegroundColor Cyan
    
    # Copy to easy access location
    Copy-Item $outputZip -Destination "native-debug-symbols.zip" -Force
    Write-Host "✅ Copied to: native-debug-symbols.zip (in project root)`n" -ForegroundColor Green
    
    explorer.exe /select,"$PWD\native-debug-symbols.zip"
} else {
    Write-Host "`n❌ Failed to create symbols file" -ForegroundColor Red
}
