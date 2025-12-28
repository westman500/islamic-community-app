# Fix iOS App Icon - Remove transparency and add solid background
Add-Type -AssemblyName System.Drawing

Write-Host "Fixing iOS App Icon - Removing Alpha Channel..." -ForegroundColor Cyan

# Source icon
$sourceIcon = "resources\icon.png"

if (!(Test-Path $sourceIcon)) {
    Write-Host "ERROR: $sourceIcon not found" -ForegroundColor Red
    exit 1
}

# Load source
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourceIcon))

# Create new 1024x1024 bitmap with NO alpha channel
$bitmap = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Fill with SOLID emerald green background (#059669)
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(5, 150, 105))
$graphics.FillRectangle($greenBrush, 0, 0, 1024, 1024)

# Draw the source icon on top
$graphics.DrawImage($sourceImage, 0, 0, 1024, 1024)

# Save to iOS AppIcon location
$outputPath = "ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-1024.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$sourceImage.Dispose()
$greenBrush.Dispose()

Write-Host "SUCCESS: iOS App Icon fixed and saved to: $outputPath" -ForegroundColor Green
Write-Host "Icon is 1024x1024 PNG with NO alpha channel" -ForegroundColor Cyan
Write-Host "Rebuild your iOS app to apply the fix" -ForegroundColor Yellow
