# 🚀 Build iOS IPA with GitHub CLI - Complete Guide

This guide shows you how to build your iOS app (.ipa file) using GitHub Actions through GitHub CLI.

## Prerequisites

### 1. GitHub CLI Installed

**Windows (PowerShell):**
```powershell
winget install --id GitHub.cli
```

**Mac (Homebrew):**
```bash
brew install gh
```

**Verify Installation:**
```bash
gh --version
```

### 2. GitHub CLI Authentication

Login to GitHub:
```bash
gh auth login
```

Follow the prompts to authenticate with your GitHub account.

### 3. GitHub Secrets Configured

Your repository needs these secrets configured:

| Secret Name | Required | Description |
|------------|----------|-------------|
| `BUILD_CERTIFICATE_BASE64` | ✅ Yes | iOS Distribution Certificate (base64) |
| `P12_PASSWORD` | ✅ Yes | Certificate password |
| `BUILD_PROVISION_PROFILE_BASE64` | ✅ Yes | Provisioning Profile (base64) |
| `KEYCHAIN_PASSWORD` | ✅ Yes | Temporary keychain password |
| `APP_STORE_CONNECT_API_KEY_ID` | ⚪ Optional | For TestFlight upload |
| `APP_STORE_CONNECT_API_ISSUER_ID` | ⚪ Optional | For TestFlight upload |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | ⚪ Optional | For TestFlight upload |

📖 **Setup Instructions:** See [GITHUB_SECRETS_COMPLETE.md](GITHUB_SECRETS_COMPLETE.md)

## 🎯 Quick Start

### Option 1: Automated Script (Recommended)

Run the automated PowerShell script:

```powershell
.\build-ios-github.ps1
```

This script will:
- ✅ Check GitHub CLI installation
- ✅ Verify authentication
- ✅ Check required secrets
- ✅ Trigger the iOS build workflow
- ✅ Watch build progress
- ✅ Download the IPA when complete

### Option 2: Manual Commands

#### Step 1: Trigger the Workflow

```bash
gh workflow run ios-build.yml --ref main
```

#### Step 2: Watch Build Progress

List recent runs:
```bash
gh run list --workflow=ios-build.yml --limit 5
```

Watch a specific run (replace `<run-id>` with actual ID):
```bash
gh run watch <run-id>
```

#### Step 3: Download the IPA

After build completes:
```bash
gh run download <run-id> --dir ./ios-build-artifacts
```

The IPA will be in: `ios-build-artifacts/masjid-ios-v1.0.2/App.ipa`

## 📋 What Gets Built

### Files Included in Build:

1. **App.ipa** - Installable iOS application
   - Contains all app code
   - Includes all resources (icons, images, etc.)
   - Code-signed with your certificate
   - Ready for TestFlight or App Store

2. **Build Artifacts:**
   - Build logs
   - Symbol files (for crash reporting)
   - Export options

### Build Process:

```
1. Checkout code from repository
2. Install Node.js dependencies
3. Build web assets (npm run build)
4. Sync with Capacitor
5. Import iOS certificates
6. Build Xcode project
7. Archive application
8. Export IPA file
9. Upload to GitHub artifacts
```

## 🔍 Monitoring the Build

### View Build Status

```bash
# List all iOS builds
gh run list --workflow=ios-build.yml

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log

# Watch in real-time
gh run watch <run-id>
```

### Build Time

- **First Build:** ~15-20 minutes
- **Subsequent Builds:** ~10-15 minutes
  - Faster due to caching

### Build Steps:

1. ⏳ **Setup** (2-3 min) - Install dependencies
2. ⏳ **Build Web** (3-4 min) - Compile React app
3. ⏳ **Sync Capacitor** (1 min) - Sync to iOS
4. ⏳ **Sign** (1 min) - Import certificates
5. ⏳ **Compile iOS** (5-8 min) - Build Xcode project
6. ⏳ **Archive** (2-3 min) - Create IPA
7. ✅ **Upload** (1 min) - Save artifact

## 📥 Downloading the IPA

### Method 1: GitHub CLI (Recommended)

```bash
# Download latest successful build
gh run list --workflow=ios-build.yml --status success --limit 1 --json databaseId --jq '.[0].databaseId' | xargs -I {} gh run download {}

# Download to specific directory
gh run download <run-id> --dir ./my-ipa-builds
```

### Method 2: GitHub Web Interface

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Click on the latest **"iOS Build and Deploy"** run
4. Scroll to **Artifacts** section
5. Click **"masjid-ios-v1.0.2"** to download
6. Extract the ZIP file
7. Get `App.ipa` from extracted folder

### Method 3: Direct URL

```bash
# Get download URL for artifacts
gh run view <run-id> --json artifacts --jq '.artifacts[0].url'
```

## 🚀 After Download

### Option A: Upload to TestFlight (Recommended)

**Using Transporter App (Mac):**
1. Open Transporter app
2. Drag and drop `App.ipa`
3. Click "Deliver"
4. Wait for upload to complete

**Using Command Line:**
```bash
xcrun altool --upload-app --type ios --file App.ipa \
  --apiKey YOUR_API_KEY_ID \
  --apiIssuer YOUR_ISSUER_ID
```

### Option B: Install on Device (TestFlight Required)

1. Upload to TestFlight (see above)
2. Install TestFlight app on your iPhone/iPad
3. Accept the invitation
4. Install the app from TestFlight

**Note:** Cannot install IPA directly on iOS devices without TestFlight or enterprise certificate.

## 🔧 Troubleshooting

### Build Fails: "Certificate not found"

**Problem:** iOS signing certificate not configured
**Solution:**
1. Check GitHub Secrets are added correctly
2. Verify certificate is not expired
3. Re-encode certificate to base64
4. See [GITHUB_SECRETS_COMPLETE.md](GITHUB_SECRETS_COMPLETE.md)

### Build Fails: "Provisioning profile doesn't match"

**Problem:** App ID mismatch
**Solution:**
1. Check provisioning profile App ID: `com.masjidmobile.app`
2. Verify in `capacitor.config.ts`: `appId: 'com.masjidmobile.app'`
3. Regenerate provisioning profile if needed

### Cannot Download Artifact

**Problem:** Artifact expired or not generated
**Solution:**
1. Artifacts expire after 30 days
2. Trigger new build: `gh workflow run ios-build.yml`
3. Check build completed successfully

### GitHub CLI Not Authenticated

**Problem:** Not logged in
**Solution:**
```bash
gh auth login
# Follow prompts to authenticate
```

### Workflow Not Found

**Problem:** Wrong repository or workflow name
**Solution:**
```bash
# List all workflows
gh workflow list

# Make sure you're in correct directory
cd /path/to/masjid

# Verify workflow file exists
ls .github/workflows/ios-build.yml
```

## 📊 Advanced Usage

### Trigger Build with Specific Branch

```bash
gh workflow run ios-build.yml --ref develop
```

### Cancel Running Build

```bash
gh run cancel <run-id>
```

### Re-run Failed Build

```bash
gh run rerun <run-id>
```

### Download Only Specific Artifact

```bash
gh run download <run-id> --name masjid-ios-v1.0.2
```

### View Build Matrix

```bash
gh run view <run-id> --log --job=build-ios
```

## 📝 Build Information

### Current Version
- **Version:** 1.0.2
- **Build:** 44
- **Bundle ID:** com.masjidmobile.app

### Included Features
- ✅ All app functionality
- ✅ Push notifications configured
- ✅ Location permissions (Qibla)
- ✅ Camera/microphone (live streaming)
- ✅ Agora SDK integrated
- ✅ Firebase configured
- ✅ Supabase backend

### Requirements
- **Minimum iOS:** 13.0
- **Target iOS:** 17.0
- **Supported Devices:** iPhone, iPad
- **Orientations:** Portrait, Landscape

## 🎯 Complete Example

Here's a complete example of building and downloading the IPA:

```powershell
# 1. Navigate to project directory
cd C:\Users\SUMMERHILL\masjid

# 2. Ensure you're logged in
gh auth status

# 3. Trigger the build
gh workflow run ios-build.yml --ref main

# 4. Wait for build to start (5-10 seconds)
Start-Sleep -Seconds 10

# 5. Get the latest run ID
$runId = gh run list --workflow=ios-build.yml --limit 1 --json databaseId --jq '.[0].databaseId'

# 6. Watch the build
gh run watch $runId

# 7. After success, download the IPA
gh run download $runId --dir ./ios-builds

# 8. Find the IPA
Get-ChildItem -Path ./ios-builds -Recurse -Filter "*.ipa"
```

## 🔗 Related Documentation

- [GITHUB_SECRETS_COMPLETE.md](GITHUB_SECRETS_COMPLETE.md) - Setup GitHub secrets
- [IOS_GITHUB_ACTIONS_SETUP.md](IOS_GITHUB_ACTIONS_SETUP.md) - Initial setup guide
- [TESTFLIGHT_MANUAL_UPLOAD.md](TESTFLIGHT_MANUAL_UPLOAD.md) - Upload to TestFlight
- [BUILD_IOS_ON_MAC.md](BUILD_IOS_ON_MAC.md) - Local build on Mac

## ✅ Checklist

Before triggering a build, ensure:

- [ ] GitHub CLI installed and authenticated
- [ ] All required secrets configured in repository
- [ ] Latest code pushed to `main` branch
- [ ] Workflow file exists: `.github/workflows/ios-build.yml`
- [ ] Certificates and provisioning profiles are valid
- [ ] Version numbers updated in `Info.plist`

## 🎉 Success!

Once your build completes successfully, you'll have:

1. ✅ **App.ipa** - Production-ready iOS app
2. ✅ Code-signed and ready for TestFlight
3. ✅ Downloadable from GitHub artifacts
4. ✅ Valid for 30 days on GitHub

**Next:** Upload to TestFlight and distribute to testers!

---

**Need Help?**
- Check [Troubleshooting](#-troubleshooting) section
- Review GitHub Actions logs
- See related documentation above
