# Fix iOS Development Team in Xcode project

$projectFile = "ios/App/App.xcodeproj/project.pbxproj"
$teamId = "WK328LRC67"

Write-Host "Adding Development Team ID to Xcode project..." -ForegroundColor Cyan

$content = Get-Content $projectFile -Raw

# Add DEVELOPMENT_TEAM to both Debug and Release configurations
$content = $content -replace '(buildSettings = \{[^}]*?)(CODE_SIGN_STYLE = Automatic;)', "`$1DEVELOPMENT_TEAM = $teamId;`n				`$2"

Set-Content -Path $projectFile -Value $content

Write-Host "✅ Added DEVELOPMENT_TEAM = $teamId" -ForegroundColor Green
Write-Host "Committing changes..." -ForegroundColor Yellow

git add $projectFile
git commit -m "Fix: Add iOS Development Team ID for code signing"
git push origin main

Write-Host "✅ Changes pushed! Build will restart automatically." -ForegroundColor Green
