# PowerShell script to generate app icon with green background and white mosque
Add-Type -AssemblyName System.Drawing

# Create 1024x1024 bitmap with green background
$bitmap = New-Object System.Drawing.Bitmap(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Fill green background (#10b981)
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129))
$graphics.FillRectangle($greenBrush, 0, 0, 1024, 1024)

# White brush for mosque
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

$centerX = 512
$centerY = 512  # Perfect center for proper tray fit
$scale = 0.7  # Optimized scale to fit within safe zone with proper padding

# Main building body
$left = $centerX - 140 * $scale
$top = $centerY - 40 * $scale
$width = 280 * $scale
$height = 180 * $scale
$graphics.FillRectangle($whiteBrush, $left, $top, $width, $height)

# Main dome (semicircle on top)
$domeX = $centerX - 80 * $scale
$domeY = $centerY - 200 * $scale
$domeWidth = 160 * $scale
$domeHeight = 160 * $scale
$graphics.FillPie($whiteBrush, $domeX, $domeY, $domeWidth, $domeHeight, 180, 180)

# Left minaret
$leftMinX = $centerX - 200 * $scale
$leftMinY = $centerY - 100 * $scale
$minWidth = 40 * $scale
$minHeight = 240 * $scale
$graphics.FillRectangle($whiteBrush, $leftMinX, $leftMinY, $minWidth, $minHeight)

# Left minaret dome
$leftDomeX = $centerX - 210 * $scale
$leftDomeY = $centerY - 130 * $scale
$leftDomeWidth = 60 * $scale
$leftDomeHeight = 60 * $scale
$graphics.FillPie($whiteBrush, $leftDomeX, $leftDomeY, $leftDomeWidth, $leftDomeHeight, 180, 180)

# Right minaret
$rightMinX = $centerX + 160 * $scale
$graphics.FillRectangle($whiteBrush, $rightMinX, $leftMinY, $minWidth, $minHeight)

# Right minaret dome
$rightDomeX = $centerX + 150 * $scale
$graphics.FillPie($whiteBrush, $rightDomeX, $leftDomeY, $leftDomeWidth, $leftDomeHeight, 180, 180)

# Crescent on main dome
$crescentX = $centerX - 30 * $scale
$crescentY = $centerY - 230 * $scale
$crescentSize = 60 * $scale
$graphics.FillEllipse($whiteBrush, $crescentX, $crescentY, $crescentSize, $crescentSize)
$graphics.FillEllipse($greenBrush, $crescentX + 15 * $scale, $crescentY, $crescentSize, $crescentSize)

# Door (green arch)
$doorArcX = $centerX - 50 * $scale
$doorArcY = $centerY + 10 * $scale
$doorArcWidth = 100 * $scale
$doorArcHeight = 100 * $scale
$graphics.FillPie($greenBrush, $doorArcX, $doorArcY, $doorArcWidth, $doorArcHeight, 180, 180)

# Door rectangle
$doorRectY = $centerY + 60 * $scale
$doorRectHeight = 80 * $scale
$graphics.FillRectangle($greenBrush, $doorArcX, $doorRectY, $doorArcWidth, $doorRectHeight)

# Left window (green arch)
$leftWinX = $centerX - 105 * $scale
$leftWinY = $centerY - 25 * $scale
$winWidth = 50 * $scale
$winHeight = 50 * $scale
$graphics.FillPie($greenBrush, $leftWinX, $leftWinY, $winWidth, $winHeight, 180, 180)
$graphics.FillRectangle($greenBrush, $leftWinX, $centerY, $winWidth, 40 * $scale)

# Right window (green arch)
$rightWinX = $centerX + 55 * $scale
$graphics.FillPie($greenBrush, $rightWinX, $leftWinY, $winWidth, $winHeight, 180, 180)
$graphics.FillRectangle($greenBrush, $rightWinX, $centerY, $winWidth, 40 * $scale)

# Save to resources/icon.png
$iconPath = "resources\icon.png"
if (-not (Test-Path "resources")) {
    New-Item -ItemType Directory -Path "resources" | Out-Null
}
$bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$graphics.Dispose()
$bitmap.Dispose()
$greenBrush.Dispose()
$whiteBrush.Dispose()

Write-Host "Icon generated: $iconPath" -ForegroundColor Green
Write-Host "Now run: npx @capacitor/assets generate --android" -ForegroundColor Cyan
