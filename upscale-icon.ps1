# PowerShell script to upscale icon and add padding to make it appear bigger
Add-Type -AssemblyName System.Drawing

# Load the 512x512 source image
$sourcePath = "app-debug-apk\favicon_io\android-chrome-512x512.png"
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))

# Create 1024x1024 canvas
$bitmap = New-Object System.Drawing.Bitmap(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Fill with transparent background
$graphics.Clear([System.Drawing.Color]::Transparent)

# Calculate size for icon to fill more of the tray (98% of canvas)
# This gives a 1% margin on each side, making the icon fill the app tray better
$margin = 10.5  # ~1% margin on each side (1024 * 0.01)
$iconSize = 1024 - ($margin * 2)  # 1003x1003 icon size
$x = $margin
$y = $margin

# Draw the icon scaled up
$destRect = New-Object System.Drawing.Rectangle($x, $y, $iconSize, $iconSize)
$srcRect = New-Object System.Drawing.Rectangle(0, 0, $sourceImage.Width, $sourceImage.Height)
$graphics.DrawImage($sourceImage, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Save to resources/icon.png
$iconPath = "resources\icon.png"
if (-not (Test-Path "resources")) {
    New-Item -ItemType Directory -Path "resources" | Out-Null
}
$bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$sourceImage.Dispose()

Write-Host "Icon upscaled and saved to: $iconPath" -ForegroundColor Green
Write-Host "Icon is now ${iconSize}x${iconSize} on a 1024x1024 canvas (98% size to fill app tray)" -ForegroundColor Cyan
Write-Host "Now run: npx @capacitor/assets generate --android" -ForegroundColor Yellow
