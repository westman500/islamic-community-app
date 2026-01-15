# Package all iOS build files for transfer to Mac

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  PACKAGE iOS BUILD FILES"              -ForegroundColor Yellow
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

$outputDir = "ios-build-package"
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$zipName = "masjid-ios-package-$timestamp.zip"

# Remove old package
Remove-Item -Path $outputDir -Recurse -Force -ErrorAction SilentlyContinue

# Create directory structure
New-Item -ItemType Directory -Path "$outputDir/signing" -Force | Out-Null
New-Item -ItemType Directory -Path "$outputDir/scripts" -Force | Out-Null

Write-Host "Copying files..." -ForegroundColor Yellow

# Copy signing files
$signingFiles = @(
    @{src="Masjid.mobileprovision"; dst="$outputDir/signing/Masjid.mobileprovision"},
    @{src="ios_distribution.cer"; dst="$outputDir/signing/ios_distribution.cer"},
    @{src="ios\AuthKey_B7929H6727.p8"; dst="$outputDir/signing/AuthKey_B7929H6727.p8"},
    @{src="profile_base64.txt"; dst="$outputDir/signing/profile_base64.txt"}
)

foreach ($file in $signingFiles) {
    if (Test-Path $file.src) {
        Copy-Item -Path $file.src -Destination $file.dst
        Write-Host "  OK: $($file.src)" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $($file.src)" -ForegroundColor Yellow
    }
}

# Copy build scripts
Copy-Item "build-ipa-mac.sh" "$outputDir/scripts/" -ErrorAction SilentlyContinue
Copy-Item "build-ios.sh" "$outputDir/scripts/" -ErrorAction SilentlyContinue

# Copy project config
Copy-Item "capacitor.config.ts" "$outputDir/" -ErrorAction SilentlyContinue
Copy-Item "package.json" "$outputDir/" -ErrorAction SilentlyContinue
Copy-Item "package-lock.json" "$outputDir/" -ErrorAction SilentlyContinue
Copy-Item "tsconfig.json" "$outputDir/" -ErrorAction SilentlyContinue
Copy-Item "vite.config.ts" "$outputDir/" -ErrorAction SilentlyContinue
Copy-Item "tailwind.config.js" "$outputDir/" -ErrorAction SilentlyContinue
Copy-Item "postcss.config.js" "$outputDir/" -ErrorAction SilentlyContinue
Copy-Item "index.html" "$outputDir/" -ErrorAction SilentlyContinue

# Copy source code
Write-Host ""
Write-Host "Copying source code..." -ForegroundColor Yellow
Copy-Item -Path "src" -Destination "$outputDir/src" -Recurse
Copy-Item -Path "public" -Destination "$outputDir/public" -Recurse -ErrorAction SilentlyContinue
Write-Host "  OK: src/" -ForegroundColor Green

# Copy dist (built web assets)
Write-Host ""
Write-Host "Copying built assets..." -ForegroundColor Yellow
Copy-Item -Path "dist" -Destination "$outputDir/dist" -Recurse
Write-Host "  OK: dist/" -ForegroundColor Green

# Copy iOS project
Write-Host ""
Write-Host "Copying iOS project..." -ForegroundColor Yellow
Copy-Item -Path "ios" -Destination "$outputDir/ios" -Recurse
Remove-Item -Path "$outputDir\ios\App\Pods" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  OK: ios/" -ForegroundColor Green

# Copy resources
Copy-Item -Path "resources" -Destination "$outputDir/resources" -Recurse -ErrorAction SilentlyContinue

# Copy GitHub Actions
Write-Host ""
Write-Host "Copying GitHub Actions..." -ForegroundColor Yellow
Copy-Item -Path ".github" -Destination "$outputDir/.github" -Recurse
Write-Host "  OK: .github/" -ForegroundColor Green

# Create README
$readmeText = "# Masjid iOS Build Package`r`n`r`nBundle ID: com.masjidmobile.app`r`nVersion: 1.2.0`r`nTeam ID: N8ZY2TY3JC`r`n`r`n## Build on Mac`r`ncd ios-build-package`r`nnpm install`r`nnpm run build`r`nnpx cap sync ios`r`ncd ios/App`r`npod install`r`nopen App.xcworkspace`r`n"
$readmeText | Out-File -FilePath "$outputDir/README.md" -Encoding UTF8

Write-Host ""
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path $outputDir -DestinationPath $zipName -Force

$zipFile = Get-Item $zipName
Write-Host ""
Write-Host "========================================"  -ForegroundColor Green
Write-Host "  PACKAGE CREATED!"                        -ForegroundColor Green  
Write-Host "========================================"  -ForegroundColor Green
Write-Host ""
Write-Host "Package: $zipName" -ForegroundColor Cyan
$sizeInMB = [math]::Round($zipFile.Length/1MB, 2)
Write-Host "Size: $sizeInMB MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Transfer $zipName to your Mac"
Write-Host "  2. Extract and run: ./scripts/build-ipa-mac.sh"
Write-Host "  3. Or use GitHub Actions (push to main branch)"
Write-Host ""

# Open folder
Start-Process explorer.exe -ArgumentList "/select,`"$PWD\$zipName`""
