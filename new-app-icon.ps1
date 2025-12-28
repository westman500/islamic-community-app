# Generate iOS and Android icons from the new Masjid Mobile icon
Add-Type -AssemblyName System.Drawing

Write-Host "Generating app icons for iOS and Android..." -ForegroundColor Cyan

# The source image should be saved as new-icon.png in the project root
$sourceIcon = "new-icon.png"

if (!(Test-Path $sourceIcon)) {
    Write-Host "ERROR: $sourceIcon not found. Please save the image first." -ForegroundColor Red
    exit 1
}

# Load source image
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourceIcon))

# iOS App Icon (1024x1024, no alpha channel)
Write-Host "Creating iOS app icon (1024x1024)..." -ForegroundColor Green
$iosBitmap = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$iosGraphics = [System.Drawing.Graphics]::FromImage($iosBitmap)
$iosGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$iosGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$iosGraphics.DrawImage($sourceImage, 0, 0, 1024, 1024)
$iosPath = "ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-1024.png"
$iosBitmap.Save($iosPath, [System.Drawing.Imaging.ImageFormat]::Png)
$iosGraphics.Dispose()
$iosBitmap.Dispose()
Write-Host "  Created: $iosPath" -ForegroundColor Gray

# Android Icons - Multiple sizes required
$androidSizes = @(
    @{Size=192; Path="android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"},
    @{Size=144; Path="android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"},
    @{Size=96; Path="android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"},
    @{Size=72; Path="android\app\src\main\res\mipmap-hdpi\ic_launcher.png"},
    @{Size=48; Path="android\app\src\main\res\mipmap-mdpi\ic_launcher.png"}
)

Write-Host "Creating Android icons..." -ForegroundColor Green
foreach ($icon in $androidSizes) {
    $size = $icon.Size
    $path = $icon.Path
    
    # Create directory if needed
    $dir = Split-Path $path -Parent
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "  Created: ${size}x${size} -> $path" -ForegroundColor Gray
}

# Round icons for Android (adaptive icons)
$androidRoundSizes = @(
    @{Size=192; Path="android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png"},
    @{Size=144; Path="android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png"},
    @{Size=96; Path="android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png"},
    @{Size=72; Path="android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png"},
    @{Size=48; Path="android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png"}
)

Write-Host "Creating Android round icons..." -ForegroundColor Green
foreach ($icon in $androidRoundSizes) {
    $size = $icon.Size
    $path = $icon.Path
    
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Create circular clip
    $path2D = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path2D.AddEllipse(0, 0, $size, $size)
    $graphics.SetClip($path2D)
    
    $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    $path2D.Dispose()
    Write-Host "  Created: ${size}x${size} round -> $path" -ForegroundColor Gray
}

# Cleanup
$sourceImage.Dispose()

Write-Host "SUCCESS: All app icons generated!" -ForegroundColor Green
Write-Host "iOS: 1024x1024 icon created" -ForegroundColor Cyan
Write-Host "Android: 5 regular + 5 round icons created" -ForegroundColor Cyan
