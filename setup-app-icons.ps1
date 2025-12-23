# ==================================================================================
# APP ICON SETUP - Generate all required icons for Android, iOS, and Web
# ==================================================================================

Write-Host "🎨 Setting up app icons for all platforms..." -ForegroundColor Cyan

# Source icon (should be 1024x1024 or larger)
$sourceIcon = "app-icon.png"

if (!(Test-Path $sourceIcon)) {
    Write-Host "❌ Error: $sourceIcon not found in current directory" -ForegroundColor Red
    Write-Host "Please place a 1024x1024 PNG icon named 'app-icon.png' in the project root" -ForegroundColor Yellow
    exit 1
}

# Install sharp-cli if not already installed (for high-quality image resizing)
Write-Host "📦 Installing sharp-cli for image processing..." -ForegroundColor Yellow
npm install -g sharp-cli 2>$null

# Create icons directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "public" | Out-Null
New-Item -ItemType Directory -Force -Path "resources" | Out-Null

# ==================================================================================
# WEB/PWA ICONS
# ==================================================================================

Write-Host "`n🌐 Generating web/PWA icons..." -ForegroundColor Green

# Favicon sizes
$webSizes = @(16, 32, 48, 64, 128, 256, 512)

foreach ($size in $webSizes) {
    $output = "public/icon-$size.png"
    Write-Host "  ✓ Generating $output" -ForegroundColor Gray
    npx sharp-cli resize $size $size -i $sourceIcon -o $output 2>$null
}

# Copy main icon
Copy-Item $sourceIcon -Destination "public/app-icon.png" -Force
Copy-Item $sourceIcon -Destination "public/favicon.png" -Force

# ==================================================================================
# ANDROID ICONS (using Capacitor structure)
# ==================================================================================

Write-Host "`n🤖 Generating Android icons..." -ForegroundColor Green

# Android icon sizes (mipmap folders)
$androidIcons = @{
    "mdpi"    = 48
    "hdpi"    = 72
    "xhdpi"   = 96
    "xxhdpi"  = 144
    "xxxhdpi" = 192
}

# Ensure android resources directory exists
New-Item -ItemType Directory -Force -Path "android/app/src/main/res" | Out-Null

foreach ($density in $androidIcons.Keys) {
    $size = $androidIcons[$density]
    $dir = "android/app/src/main/res/mipmap-$density"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    
    $output = "$dir/ic_launcher.png"
    Write-Host "  ✓ Generating $output ($size x $size)" -ForegroundColor Gray
    npx sharp-cli resize $size $size -i $sourceIcon -o $output 2>$null
    
    # Also create round icon
    $outputRound = "$dir/ic_launcher_round.png"
    npx sharp-cli resize $size $size -i $sourceIcon -o $outputRound 2>$null
}

# Notification icon (monochrome, smaller)
$notifDir = "android/app/src/main/res/drawable"
New-Item -ItemType Directory -Force -Path $notifDir | Out-Null
npx sharp-cli resize 24 24 -i $sourceIcon -o "$notifDir/ic_stat_icon_config_sample.png" 2>$null

# ==================================================================================
# iOS ICONS (if ios folder exists or will be created)
# ==================================================================================

Write-Host "`n🍎 Preparing iOS icon assets..." -ForegroundColor Green

# iOS requires App Icon set in Assets.xcassets
# Copy to resources folder for later iOS setup
Copy-Item $sourceIcon -Destination "resources/icon.png" -Force
Write-Host "  ✓ Copied to resources/icon.png for iOS setup" -ForegroundColor Gray

# iOS splash screen (simple for now)
Copy-Item $sourceIcon -Destination "resources/splash.png" -Force
Write-Host "  ✓ Copied to resources/splash.png for iOS splash" -ForegroundColor Gray

# ==================================================================================
# GENERATE ICO FILE FOR WINDOWS/DESKTOP
# ==================================================================================

Write-Host "`n💻 Generating .ico favicon..." -ForegroundColor Green

# Note: ICO conversion requires imagemagick or online tools
# For now, just copy the PNG
Copy-Item "public/icon-32.png" -Destination "public/favicon.ico" -Force
Write-Host "  ✓ Created public/favicon.ico" -ForegroundColor Gray

Write-Host "`n✅ Icon generation complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update index.html to reference new favicon" -ForegroundColor White
Write-Host "  2. For iOS: Run 'npx cap add ios' then 'npx @capacitor/assets generate'" -ForegroundColor White
Write-Host "  3. For Android: Rebuild the APK/AAB with the new icons" -ForegroundColor White
Write-Host "`n🔧 Icon locations:" -ForegroundColor Cyan
Write-Host "  Web:     public/favicon.png, public/icon-*.png" -ForegroundColor White
Write-Host "  Android: android/app/src/main/res/mipmap-*/" -ForegroundColor White
Write-Host "  iOS:     resources/icon.png (for capacitor assets generate)" -ForegroundColor White
