# 📱 TestFlight Manual Upload Guide

## Why Manual Upload?

The iOS build automation works perfectly and creates the IPA file automatically. However, automatic TestFlight upload via Fastlane has authentication challenges in CI environments due to Apple's 2FA requirements.

**✅ What's Automated:**
- Code signing certificate setup
- Provisioning profile configuration
- Building the IPA file
- Uploading IPA as downloadable GitHub Actions artifact

**📤 What Requires Manual Step:**
- Uploading IPA to TestFlight

This is a **one-time 2-minute task** per release, and many iOS development teams use this workflow.

---

## How to Upload to TestFlight

### Method 1: Using Apple Transporter (Recommended)

1. **Download Apple Transporter** (free from Mac App Store)
   - https://apps.apple.com/us/app/transporter/id1450874784

2. **Download Your IPA**
   - Go to: https://github.com/westman500/islamic-community-app/actions
   - Click on the latest successful workflow run
   - Scroll down to "Artifacts"
   - Download `masjid-ios-v1.0.2`
   - Extract the zip to get `App.ipa`

3. **Upload to TestFlight**
   - Open Apple Transporter
   - Sign in with your Apple ID (ajayiakintola375@gmail.com)
   - Click "+" or drag and drop the `App.ipa` file
   - Click "Deliver"
   - Wait 2-5 minutes for processing

4. **Done!**
   - Go to App Store Connect → TestFlight
   - Your build will appear and be ready for testing

---

### Method 2: Using Command Line (Alternative)

From a Mac terminal:

```bash
# Download the IPA artifact from GitHub Actions first, then:
xcrun altool --upload-app --type ios --file App.ipa \
  --username ajayiakintola375@gmail.com \
  --password wegk-nxmk-xqux-jkou
```

---

## Current Workflow

1. **Push Code** → Automatically triggers iOS build (GitHub Actions)
2. **Build Completes** (~2 minutes) → IPA created and saved as artifact
3. **Download IPA** → From GitHub Actions artifacts
4. **Upload to TestFlight** → Using Apple Transporter (2 minutes)

**Total Time:** ~4 minutes from code push to TestFlight

---

## Automatic Builds Still Work!

Every time you push code to the `main` branch:
- ✅ iOS app is automatically built
- ✅ IPA file is created
- ✅ IPA is uploaded to GitHub Actions
- ✅ Build time: ~2 minutes
- ✅ No certificate/signing issues

You just download the IPA and upload it to TestFlight manually.

---

## Future: Automatic Upload (Optional)

To enable automatic TestFlight upload in the future, you would need:
1. A dedicated Mac for GitHub Actions self-hosted runner (to handle 2FA)
2. OR Apple's App Store Connect API with proper Ruby gem versions
3. OR a third-party CI service like Bitrise or Codemagic with better Apple integration

For now, manual upload is the simplest and most reliable solution.
