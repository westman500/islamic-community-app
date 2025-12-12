# PowerShell script to add solid green background to fill app tray
Add-Type -AssemblyName System.Drawing

# Load the current icon
$sourcePath = "app-debug-apk\favicon_io\android-chrome-512x512.png"
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))

# Create 1024x1024 canvas with SOLID GREEN BACKGROUND
$bitmap = New-Object System.Drawing.Bitmap(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Fill ENTIRE canvas with solid green (#10b981 - emerald green)
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
$graphics.FillRectangle($greenBrush, 0, 0, 1024, 1024)

# Calculate size for icon (90% of canvas for better visibility)
$margin = 52  # 5% margin
$iconSize = 920  # 90% of 1024
$x = $margin
$y = $margin

# Draw the icon on top of green background
$destRect = New-Object System.Drawing.Rectangle($x, $y, $iconSize, $iconSize)
$srcRect = New-Object System.Drawing.Rectangle(0, 0, $sourceImage.Width, $sourceImage.Height)
$graphics.DrawImage($sourceImage, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Save to resources/icon.png
$iconPath = "resources\icon.png"
$bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$sourceImage.Dispose()
$greenBrush.Dispose()

Write-Host "Icon with solid green background saved to: $iconPath" -ForegroundColor Green
Write-Host "Green background (#10b981) fills entire 1024x1024 canvas" -ForegroundColor Cyan
