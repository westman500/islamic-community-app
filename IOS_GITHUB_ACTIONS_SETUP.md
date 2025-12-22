# 🍎 iOS GitHub Actions - Complete Setup Guide

## What Was Created

Your project now has **automated iOS builds** using GitHub Actions. Every time you push changes, GitHub will:
1. Build your iOS app on Apple's macOS servers (FREE)
2. Create an IPA file
3. Upload to TestFlight automatically
4. Make IPA available for download

---

## 📋 Files Created

### 1. GitHub Workflow
- **[.github/workflows/ios-build.yml](.github/workflows/ios-build.yml)** - Automated build pipeline

### 2. Fastlane Configuration
- **[ios/App/fastlane/Fastfile](ios/App/fastlane/Fastfile)** - Build automation scripts
- **[ios/App/fastlane/Appfile](ios/App/fastlane/Appfile)** - App configuration
- **[ios/App/Gemfile](ios/App/Gemfile)** - Ruby dependencies

### 3. Setup Helper
- **[setup-ios-github-actions.ps1](setup-ios-github-actions.ps1)** - PowerShell script to convert certificates to base64

---

## 🚀 Quick Start (5 Steps)

### Step 1: Run the Setup Script

```powershell
.\setup-ios-github-actions.ps1
```

This script will:
- Guide you through certificate conversion
- Convert files to base64 for GitHub
- Generate text files with values to copy

### Step 2: Get Apple Certificates

You need 3 things from Apple Developer Portal:

#### A. iOS Distribution Certificate (.p12)
1. Go to https://developer.apple.com/account/resources/certificates
2. Create → iOS Distribution (App Store and Ad Hoc)
3. Download and export as .p12 with a password

#### B. Provisioning Profile (.mobileprovision)
1. Go to https://developer.apple.com/account/resources/profiles
2. Create → App Store Distribution
3. App ID: `com.masjidmobile.app` (create if needed)
4. Download the .mobileprovision file

#### C. App Store Connect API Key (.p8)
1. Go to https://appstoreconnect.apple.com/access/api
2. Create new key → Developer/App Manager access
3. Download .p8 file ⚠️ ONLY SHOWN ONCE!
4. Note the **Key ID** and **Issuer ID**

### Step 3: Add GitHub Secrets

Go to your GitHub repository:
```
Settings → Secrets and variables → Actions → New repository secret
```

Add these 7 secrets:

| Secret Name | Value | How to Get |
|------------|-------|------------|
| `BUILD_CERTIFICATE_BASE64` | Base64 of .p12 | Run setup script |
| `P12_PASSWORD` | Password for .p12 | The password you set |
| `BUILD_PROVISION_PROFILE_BASE64` | Base64 of .mobileprovision | Run setup script |
| `KEYCHAIN_PASSWORD` | Any random password | e.g., `MyTempKeychainPass123` |
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID | From App Store Connect |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID | From App Store Connect |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | Base64 of .p8 | Run setup script |

### Step 4: Commit and Push

```bash
git add .
git commit -m "Add iOS build automation with GitHub Actions"
git push origin main
```

### Step 5: Watch It Build!

1. Go to your GitHub repository
2. Click "Actions" tab
3. You'll see "iOS Build and Deploy" running
4. Wait ~15-20 minutes for first build
5. Download IPA from "Artifacts" section

---

## 📱 Manual Trigger

You can also trigger builds manually:

1. Go to: Repository → Actions
2. Select "iOS Build and Deploy"
3. Click "Run workflow"
4. Select branch → "Run workflow"

---

## 🎯 What Happens During Build

```
1. Checkout code from GitHub
2. Install Node.js dependencies
3. Build web assets (npm run build)
4. Sync to iOS (npx cap sync ios)
5. Install Ruby/Fastlane
6. Import certificates
7. Build IPA file
8. Upload to TestFlight
9. Save IPA as downloadable artifact
```

**Time:** ~15-20 minutes  
**Cost:** FREE (GitHub Actions includes macOS runners)

---

## 📥 Getting Your IPA

After build completes:

1. Go to: Actions → Your workflow run
2. Scroll to "Artifacts"
3. Download `masjid-ios-v1.0.2.zip`
4. Extract to get `App.ipa`

You can install this on:
- Physical devices (via Xcode or TestFlight)
- TestFlight beta testers
- App Store (after review)

---

## 🔧 Troubleshooting

### Build Fails: "Code signing error"
**Solution:** Check that:
- Certificate matches provisioning profile
- Bundle ID is `com.masjidmobile.app` in all places
- Certificate is not expired

### Build Fails: "Invalid API Key"
**Solution:** Verify:
- Key ID and Issuer ID are correct
- API key content is base64 encoded properly
- Key has "Developer" or "App Manager" role

### Build Succeeds But Upload Fails
**Solution:**
- Create the app in App Store Connect first
- Ensure API key has upload permissions

### Need to Update Certificates
**Solution:**
- Update the corresponding GitHub Secret
- Re-run the workflow

---

## 📊 Version Management

The workflow automatically:
- Uses version from [package.json](package.json) (1.0.2)
- Sets build number from GitHub run number
- Updates iOS Info.plist

To release new version:
1. Update version in `package.json`
2. Update version in [.github/workflows/ios-build.yml](.github/workflows/ios-build.yml#L52-53)
3. Commit and push

---

## 🎨 Next Steps

### Add App to App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Platform:** iOS
   - **Name:** Masjid - Islamic Community
   - **Primary Language:** English
   - **Bundle ID:** com.masjidmobile.app
   - **SKU:** masjid-islamic-001

### Prepare App Store Listing

Create these assets:
- App screenshots (various iPhone sizes)
- App icon 1024x1024px
- Privacy policy URL
- App description
- Keywords

### Submit for Review

1. Upload build via TestFlight (automatic from workflow)
2. Complete App Store listing
3. Submit for review
4. Wait 1-3 days for approval

---

## 💰 Cost Breakdown

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Account | $99 | Per year |
| GitHub Actions (macOS) | FREE | Unlimited |
| Build time | FREE | ~20min/build |
| **Total** | **$99/year** | |

---

## 🔐 Security Notes

1. **Never commit certificates directly**
   - Always use GitHub Secrets
   - Delete `cert_base64.txt` and similar files after upload

2. **Rotate API keys regularly**
   - Create new keys every 6-12 months
   - Revoke old keys

3. **Limit API key permissions**
   - Use "Developer" role, not "Admin"

---

## 📚 Useful Commands

```bash
# Build iOS locally (requires Mac)
npm run build
npx cap sync ios
npx cap open ios

# Test Fastlane locally (requires Mac)
cd ios/App
bundle exec fastlane build

# View GitHub Actions logs
# Go to: https://github.com/YOUR_USERNAME/masjid/actions
```

---

## 🆘 Need Help?

1. **Check GitHub Actions logs** - Most errors show here
2. **Apple Developer Forums** - For certificate issues
3. **Fastlane Docs** - https://docs.fastlane.tools
4. **GitHub Actions Docs** - https://docs.github.com/actions

---

## ✅ Success Checklist

- [ ] Apple Developer Account enrolled ($99)
- [ ] Created iOS Distribution Certificate
- [ ] Created App Store Provisioning Profile
- [ ] Created App Store Connect API Key
- [ ] Ran `setup-ios-github-actions.ps1`
- [ ] Added all 7 GitHub Secrets
- [ ] Pushed code to GitHub
- [ ] First build completed successfully
- [ ] Downloaded IPA from Artifacts
- [ ] Created app in App Store Connect
- [ ] Uploaded to TestFlight

---

**You're all set!** 🎉

Every push to `main` branch will now automatically build and upload your iOS app!
