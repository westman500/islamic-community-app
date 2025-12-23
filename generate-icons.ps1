# Simple App Icon Generator
Write-Host "`n🎨 Generating app icons...`n" -ForegroundColor Cyan

$sourceIcon = "app-icon.png"

if (!(Test-Path $sourceIcon)) {
    Write-Host "❌ Error: app-icon.png not found" -ForegroundColor Red
    exit 1
}

# Create directories
New-Item -ItemType Directory -Force -Path "public" | Out-Null
New-Item -ItemType Directory -Force -Path "resources" | Out-Null
New-Item -ItemType Directory -Force -Path "android\app\src\main\res\mipmap-mdpi" | Out-Null
New-Item -ItemType Directory -Force -Path "android\app\src\main\res\mipmap-hdpi" | Out-Null
New-Item -ItemType Directory -Force -Path "android\app\src\main\res\mipmap-xhdpi" | Out-Null
New-Item -ItemType Directory -Force -Path "android\app\src\main\res\mipmap-xxhdpi" | Out-Null
New-Item -ItemType Directory -Force -Path "android\app\src\main\res\mipmap-xxxhdpi" | Out-Null

Write-Host "📱 Copying icons for web and Android..." -ForegroundColor Green

# Web/PWA icons
Copy-Item $sourceIcon -Destination "public\app-icon.png" -Force
Copy-Item $sourceIcon -Destination "public\favicon.png" -Force
Copy-Item $sourceIcon -Destination "public\icon-512.png" -Force
Copy-Item $sourceIcon -Destination "public\icon-192.png" -Force

# Android icons (copy full size for now - Android Studio will optimize)
Copy-Item $sourceIcon -Destination "android\app\src\main\res\mipmap-mdpi\ic_launcher.png" -Force
Copy-Item $sourceIcon -Destination "android\app\src\main\res\mipmap-hdpi\ic_launcher.png" -Force
Copy-Item $sourceIcon -Destination "android\app\src\main\res\mipmap-xhdpi\ic_launcher.png" -Force
Copy-Item $sourceIcon -Destination "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png" -Force
Copy-Item $sourceIcon -Destination "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png" -Force

# iOS resources
Copy-Item $sourceIcon -Destination "resources\icon.png" -Force
Copy-Item $sourceIcon -Destination "resources\splash.png" -Force

Write-Host "`n✅ Icons copied successfully!" -ForegroundColor Green
Write-Host "`n📋 Icon locations:" -ForegroundColor Cyan
Write-Host "  Web:     public\favicon.png, public\app-icon.png" -ForegroundColor White
Write-Host "  Android: android\app\src\main\res\mipmap-*\ic_launcher.png" -ForegroundColor White
Write-Host "  iOS:     resources\icon.png" -ForegroundColor White

Write-Host "`n⚠️  Note: For production, use Android Studio's Image Asset tool" -ForegroundColor Yellow
Write-Host "   to generate properly sized icons from app-icon.png`n" -ForegroundColor Yellow

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. npm run build" -ForegroundColor White
Write-Host "  2. npx cap sync android" -ForegroundColor White
Write-Host "  3. npx cap open android`n" -ForegroundColor White
