# GitHub Actions iOS Build Setup
# ================================
# This script helps you prepare the secrets needed for GitHub Actions iOS builds

Write-Host "🍎 GitHub Actions iOS Build Setup" -ForegroundColor Cyan
Write-Host "=" * 50

Write-Host @"

📋 STEP 1: REQUIRED SECRETS
===========================
You need to add these secrets to your GitHub repository:
Go to: GitHub Repo → Settings → Secrets and variables → Actions → New repository secret

"@ -ForegroundColor Yellow

# List of required secrets
$secrets = @(
    @{Name="BUILD_CERTIFICATE_BASE64"; Desc="Your .p12 certificate encoded in base64"},
    @{Name="P12_PASSWORD"; Desc="Password for your .p12 certificate"},
    @{Name="PROVISIONING_PROFILE_BASE64"; Desc="Your .mobileprovision file encoded in base64"},
    @{Name="APPLE_TEAM_ID"; Desc="Your Apple Developer Team ID (e.g., ABC123XYZ)"},
    @{Name="KEYCHAIN_PASSWORD"; Desc="Any random password for temporary keychain (e.g., 'temp123')"},
    @{Name="APPLE_ID"; Desc="Your Apple ID email (for App Store submission)"},
    @{Name="APP_SPECIFIC_PASSWORD"; Desc="App-specific password from appleid.apple.com"}
)

foreach ($secret in $secrets) {
    Write-Host "  • $($secret.Name)" -ForegroundColor Green
    Write-Host "    $($secret.Desc)" -ForegroundColor Gray
}

Write-Host @"

📋 STEP 2: GENERATE BASE64 ENCODED FILES
=========================================
Run these commands on a Mac where you have your certificate and provisioning profile:

"@ -ForegroundColor Yellow

Write-Host @"
# Encode your .p12 certificate:
base64 -i YourCertificate.p12 | pbcopy
# Then paste the result as BUILD_CERTIFICATE_BASE64 secret

# Encode your provisioning profile:
base64 -i YourApp.mobileprovision | pbcopy
# Then paste the result as PROVISIONING_PROFILE_BASE64 secret
"@ -ForegroundColor Cyan

Write-Host @"

📋 STEP 3: GET APP-SPECIFIC PASSWORD
=====================================
1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to "Sign-In and Security" → "App-Specific Passwords"
4. Click "Generate an app-specific password"
5. Name it "GitHub Actions" and click "Create"
6. Copy the password and save as APP_SPECIFIC_PASSWORD secret

"@ -ForegroundColor Yellow

Write-Host @"

📋 STEP 4: FIND YOUR TEAM ID
============================
1. Go to https://developer.apple.com/account
2. Click on "Membership" in the sidebar
3. Your Team ID is listed there (10 characters, letters and numbers)
4. Save it as APPLE_TEAM_ID secret

"@ -ForegroundColor Yellow

Write-Host @"

📋 STEP 5: TRIGGER THE BUILD
============================
1. Push this workflow file to your GitHub repository
2. Go to: GitHub Repo → Actions → "Build iOS App"
3. Click "Run workflow"
4. Select options and click "Run workflow"

The build will:
- Build your web assets
- Sync Capacitor iOS
- Build and sign the IPA
- Upload IPA as artifact (downloadable for 30 days)
- Optionally submit to App Store Connect

"@ -ForegroundColor Yellow

Write-Host @"

⚠️  IMPORTANT NOTES
==================
• The macOS runner costs more GitHub Actions minutes
• Free tier: 2,000 minutes/month (macOS counts as 10x, so ~200 min for iOS builds)
• Each build takes ~15-30 minutes
• You need a paid Apple Developer account ($99/year)

"@ -ForegroundColor Red

Write-Host "✅ Workflow file created at: .github/workflows/build-ios.yml" -ForegroundColor Green
