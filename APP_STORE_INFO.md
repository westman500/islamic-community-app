# App Store Configuration

## App Identifiers

**App Store App ID:** `WK328LRC67`  
**Bundle ID:** `com.masjidmobile.app`  
**App Name:** Masjid - Islamic Community  
**SKU:** `masjid-app-001` (or choose your own)

---

## Current Versions

**Android (AAB):**
- Version: 1.0.2
- Version Code: 12
- Built: December 21, 2025
- File: [masjid-app-v1.0.2-2025-12-21-1909.aab](masjid-app-v1.0.2-2025-12-21-1909.aab)

**iOS (IPA):**
- Version: 1.0.2
- Build: 12
- Status: Ready for GitHub Actions build

---

## App Store Connect Setup

### 1. Create App (If Not Already Done)
- Go to https://appstoreconnect.apple.com
- My Apps → "+" → New App
- Platform: iOS
- Name: Masjid - Islamic Community
- Bundle ID: com.masjidmobile.app
- SKU: masjid-app-001

### 2. Required Information

**Category:** Lifestyle → Religion & Spirituality  
**Subtitle:** Connect, Pray, Give - Islamic Community  
**Privacy Policy:** [Required - create before submission]  
**Support URL:** [Your website or email]

### 3. App Description

```
Masjid connects Muslims worldwide with comprehensive features for worship, 
learning, and community engagement.

FEATURES:
📿 Live prayer services and Islamic lectures
💰 Secure Zakat donations to verified scholars
🎥 Livestream consultations and Q&A sessions
👥 Connect with mosques and Islamic centers
🔐 Verified scholars and secure payments

Join thousands using Masjid to strengthen their faith and connect with 
the global Islamic community.
```

**Keywords:** islam, muslim, mosque, masjid, prayer, zakat, quran, islamic, scholar, imam, halal, ramadan, charity, donation, consultation

---

## GitHub Actions Configuration

When setting up GitHub Secrets, you'll need:

### Required Secrets (7 total)

1. **BUILD_CERTIFICATE_BASE64**
   - iOS Distribution Certificate (.p12) converted to base64
   - Get from: https://developer.apple.com/account/resources/certificates

2. **P12_PASSWORD**
   - Password you set when exporting .p12 certificate

3. **BUILD_PROVISION_PROFILE_BASE64**
   - App Store Provisioning Profile (.mobileprovision) converted to base64
   - Get from: https://developer.apple.com/account/resources/profiles
   - Must use Bundle ID: `com.masjidmobile.app`

4. **KEYCHAIN_PASSWORD**
   - Any random password for temporary keychain
   - Example: `GitHubActions2025!`

5. **APP_STORE_CONNECT_API_KEY_ID**
   - Key ID from App Store Connect API Key
   - Get from: https://appstoreconnect.apple.com/access/api

6. **APP_STORE_CONNECT_API_ISSUER_ID**
   - Issuer ID from App Store Connect API Key
   - Same page as Key ID

7. **APP_STORE_CONNECT_API_KEY_CONTENT**
   - App Store Connect API Key (.p8) converted to base64
   - Download from App Store Connect (shown only once!)

---

## Build & Deploy Process

### Android (Google Play)
✅ Already built: [masjid-app-v1.0.2-2025-12-21-1909.aab](masjid-app-v1.0.2-2025-12-21-1909.aab)

**Upload Steps:**
1. Go to https://play.google.com/console
2. Select your app → Production
3. Create new release
4. Upload AAB file
5. Add release notes:
   ```
   - Fixed scholar balance updates for Zakat donations
   - Improved livestream connection stability
   - Updated app branding
   - Bug fixes and performance improvements
   ```

### iOS (App Store)
⏳ Automated via GitHub Actions

**Process:**
1. Get Apple certificates (see above)
2. Run: `.\setup-ios-github-actions.ps1`
3. Add 7 GitHub Secrets
4. Push to GitHub
5. GitHub Actions builds automatically
6. IPA uploaded to TestFlight
7. Submit for review from App Store Connect

---

## Support & Documentation

**Setup Scripts:**
- [setup-ios-github-actions.ps1](setup-ios-github-actions.ps1) - Convert certificates to base64

**Documentation:**
- [IOS_GITHUB_ACTIONS_SETUP.md](IOS_GITHUB_ACTIONS_SETUP.md) - Complete iOS setup guide
- [ANDROID_APK_BUILD.md](ANDROID_APK_BUILD.md) - Android build guide
- [IOS_APP_STORE_SETUP.md](IOS_APP_STORE_SETUP.md) - App Store submission guide

**Workflows:**
- [.github/workflows/ios-build.yml](.github/workflows/ios-build.yml) - iOS build automation

---

## Quick Reference

| Platform | Store | Bundle/Package ID | Version | Status |
|----------|-------|-------------------|---------|--------|
| Android | Google Play | com.masjidmobile.app | 1.0.2 (12) | ✅ Ready |
| iOS | App Store | com.masjidmobile.app | 1.0.2 (12) | ⏳ Pending Setup |

**App Store App ID:** WK328LRC67  
**Last Updated:** December 22, 2025
