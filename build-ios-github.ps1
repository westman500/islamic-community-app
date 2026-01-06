# Build iOS IPA using GitHub Actions and GitHub CLI
# This script triggers the workflow and downloads the built IPA

Write-Host "🍎 iOS IPA Build via GitHub Actions" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install GitHub CLI:" -ForegroundColor Yellow
    Write-Host "winget install --id GitHub.cli" -ForegroundColor White
    Write-Host ""
    Write-Host "Or download from: https://cli.github.com/" -ForegroundColor White
    exit 1
}

# Check if logged in
Write-Host "🔐 Checking GitHub authentication..." -ForegroundColor Yellow
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to GitHub CLI" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run: gh auth login" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ GitHub CLI authenticated" -ForegroundColor Green
Write-Host ""

# Get repository info
Write-Host "📦 Getting repository information..." -ForegroundColor Yellow
$repoInfo = gh repo view --json nameWithOwner,name,owner -q "{owner: .owner.login, repo: .name, full: .nameWithOwner}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to get repository info" -ForegroundColor Red
    Write-Host "Make sure you're in a git repository directory" -ForegroundColor Yellow
    exit 1
}

$repo = $repoInfo | ConvertFrom-Json
Write-Host "✅ Repository: $($repo.full)" -ForegroundColor Green
Write-Host ""

# Check if workflow file exists
$workflowFile = ".github/workflows/ios-build.yml"
if (-not (Test-Path $workflowFile)) {
    Write-Host "❌ Workflow file not found: $workflowFile" -ForegroundColor Red
    Write-Host "Please ensure the iOS build workflow exists" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Found workflow: $workflowFile" -ForegroundColor Green
Write-Host ""

# Check if secrets are configured
Write-Host "🔑 Checking required GitHub Secrets..." -ForegroundColor Yellow
$requiredSecrets = @(
    "BUILD_CERTIFICATE_BASE64",
    "P12_PASSWORD",
    "BUILD_PROVISION_PROFILE_BASE64",
    "KEYCHAIN_PASSWORD"
)

$secretsList = gh secret list --json name -q ".[].name"
$secretsArray = $secretsList -split "`n"

$missingSecrets = @()
foreach ($secret in $requiredSecrets) {
    if ($secretsArray -notcontains $secret) {
        $missingSecrets += $secret
    }
}

if ($missingSecrets.Count -gt 0) {
    Write-Host "⚠️  Missing required secrets:" -ForegroundColor Yellow
    foreach ($secret in $missingSecrets) {
        Write-Host "   - $secret" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "📖 See GITHUB_SECRETS_COMPLETE.md for setup instructions" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
} else {
    Write-Host "✅ All required secrets configured" -ForegroundColor Green
}
Write-Host ""

# Trigger the workflow
Write-Host "🚀 Triggering iOS build workflow..." -ForegroundColor Cyan
Write-Host ""

gh workflow run "ios-build.yml" --ref main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to trigger workflow" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Workflow triggered successfully!" -ForegroundColor Green
Write-Host ""

# Wait a moment for the run to appear
Write-Host "⏳ Waiting for workflow run to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Get the latest run
Write-Host "📊 Fetching workflow status..." -ForegroundColor Yellow
$runInfo = gh run list --workflow=ios-build.yml --limit 1 --json databaseId,status,conclusion,createdAt,url

if ($runInfo) {
    $run = $runInfo | ConvertFrom-Json | Select-Object -First 1
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         iOS Build Started Successfully! 🎉            ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📌 Run ID: $($run.databaseId)" -ForegroundColor White
    Write-Host "🕐 Started: $($run.createdAt)" -ForegroundColor White
    Write-Host "📊 Status: $($run.status)" -ForegroundColor Yellow
    Write-Host "🔗 URL: $($run.url)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "⏱️  Estimated build time: 15-20 minutes" -ForegroundColor Yellow
    Write-Host ""
    
    # Ask if user wants to watch the build
    $watch = Read-Host "Watch build progress? (Y/n)"
    if ($watch -ne "n" -and $watch -ne "N") {
        Write-Host ""
        Write-Host "📡 Watching build progress (Press Ctrl+C to stop)..." -ForegroundColor Cyan
        Write-Host ""
        
        gh run watch $run.databaseId
        
        # After watching, check if completed
        $finalRun = gh run view $run.databaseId --json status,conclusion | ConvertFrom-Json
        
        Write-Host ""
        if ($finalRun.conclusion -eq "success") {
            Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
            Write-Host "║            ✅ BUILD SUCCESSFUL! ✅                     ║" -ForegroundColor Green
            Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
            Write-Host ""
            
            # Ask to download artifact
            $download = Read-Host "Download IPA artifact? (Y/n)"
            if ($download -ne "n" -and $download -ne "N") {
                Write-Host ""
                Write-Host "📥 Downloading IPA artifact..." -ForegroundColor Cyan
                
                # Create download directory
                $downloadDir = "ios-build-artifacts"
                if (-not (Test-Path $downloadDir)) {
                    New-Item -ItemType Directory -Path $downloadDir | Out-Null
                }
                
                # Download artifact
                gh run download $run.databaseId --dir $downloadDir
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ IPA downloaded to: $downloadDir\" -ForegroundColor Green
                    Write-Host ""
                    
                    # Find the IPA file
                    $ipaFile = Get-ChildItem -Path $downloadDir -Recurse -Filter "*.ipa" | Select-Object -First 1
                    if ($ipaFile) {
                        Write-Host "📱 IPA Location: $($ipaFile.FullName)" -ForegroundColor Cyan
                        Write-Host ""
                        Write-Host "📤 Next Steps:" -ForegroundColor Yellow
                        Write-Host "   1. Upload to TestFlight: https://appstoreconnect.apple.com/" -ForegroundColor White
                        Write-Host "   2. Or use Transporter app on Mac" -ForegroundColor White
                        Write-Host "   3. See TESTFLIGHT_MANUAL_UPLOAD.md for details" -ForegroundColor White
                    }
                } else {
                    Write-Host "⚠️  Failed to download artifact" -ForegroundColor Yellow
                }
            }
        } elseif ($finalRun.conclusion -eq "failure") {
            Write-Host "❌ BUILD FAILED!" -ForegroundColor Red
            Write-Host ""
            Write-Host "View logs at: $($run.url)" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "📖 Monitor build progress at:" -ForegroundColor Cyan
        Write-Host "   $($run.url)" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 Or run: gh run watch $($run.databaseId)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Could not fetch run information" -ForegroundColor Yellow
    Write-Host "Check GitHub Actions tab in your repository" -ForegroundColor White
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Helpful Commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  View all runs:" -ForegroundColor Yellow
Write-Host "    gh run list --workflow=ios-build.yml" -ForegroundColor White
Write-Host ""
Write-Host "  Watch specific run:" -ForegroundColor Yellow
Write-Host "    gh run watch <run-id>" -ForegroundColor White
Write-Host ""
Write-Host "  Download artifacts:" -ForegroundColor Yellow
Write-Host "    gh run download <run-id>" -ForegroundColor White
Write-Host ""
Write-Host "  View logs:" -ForegroundColor Yellow
Write-Host "    gh run view <run-id> --log" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
