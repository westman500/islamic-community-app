# Quick Deploy to cPanel/Server via FTP
# Run this from PowerShell in the admin folder

param(
    [Parameter(Mandatory=$true)]
    [string]$FtpHost,
    
    [Parameter(Mandatory=$true)]
    [string]$FtpUser,
    
    [Parameter(Mandatory=$true)]
    [string]$FtpPassword,
    
    [string]$RemotePath = "/public_html/admin"
)

Write-Host "🚀 Deploying Admin Dashboard to cPanel..." -ForegroundColor Cyan

# Files to deploy
$files = @(
    "index.html",
    "admin.js",
    "README.md"
)

# FTP Upload function
function Upload-File {
    param($LocalFile, $RemoteFile)
    
    try {
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)
        $uri = "ftp://$FtpHost$RemotePath/$RemoteFile"
        
        Write-Host "Uploading $LocalFile..." -ForegroundColor Yellow
        $webclient.UploadFile($uri, $LocalFile)
        Write-Host "✅ Uploaded $LocalFile" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to upload $LocalFile : $_" -ForegroundColor Red
    }
}

# Check if files exist
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ File not found: $file" -ForegroundColor Red
        Write-Host "Make sure you run this from the admin folder!" -ForegroundColor Yellow
        exit 1
    }
}

# Create remote directory if it doesn't exist
try {
    $webclient = New-Object System.Net.WebClient
    $webclient.Credentials = New-Object System.Net.NetworkCredential($FtpUser, $FtpPassword)
    $uri = "ftp://$FtpHost$RemotePath/"
    
    # Try to list directory (will fail if doesn't exist)
    try {
        $webclient.DownloadString($uri) | Out-Null
        Write-Host "📁 Remote directory exists" -ForegroundColor Green
    }
    catch {
        Write-Host "📁 Creating remote directory..." -ForegroundColor Yellow
        # Note: Some FTP servers don't allow MKD via WebClient
        # You may need to create the directory manually first
        Write-Host "⚠️  If upload fails, create '$RemotePath' directory in cPanel first" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "⚠️  Could not verify remote directory" -ForegroundColor Yellow
}

# Upload all files
Write-Host "`n📤 Starting upload..." -ForegroundColor Cyan
foreach ($file in $files) {
    Upload-File -LocalFile $file -RemoteFile $file
}

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌐 Visit your admin panel at: https://yourdomain.com/admin" -ForegroundColor Cyan
Write-Host "   (Or your configured subdomain)" -ForegroundColor Gray

# Usage example
Write-Host "`nUsage Example:" -ForegroundColor Yellow
Write-Host ".\deploy-cpanel.ps1 -FtpHost 'ftp.yoursite.com' -FtpUser 'username' -FtpPassword 'password'" -ForegroundColor Gray
