# 🍎 iOS App Store Setup Guide

## Prerequisites

Before submitting to the Apple App Store, you'll need:

1. **Apple Developer Account** ($99/year)
   - Enroll at: https://developer.apple.com/programs/
   - Complete account verification (can take 24-48 hours)

2. **macOS Computer** (required for Xcode)
   - macOS Ventura or later recommended
   - At least 20GB free space for Xcode

3. **Xcode** (latest version)
   - Download from Mac App Store
   - Install Command Line Tools

---

## Step 1: Add iOS Platform to Project

On your macOS machine, run:

```bash
# Navigate to project
cd c:\Users\SUMMERHILL\masjid

# Install Capacitor iOS platform
npx cap add ios

# Generate iOS app icons and splash screens automatically
npm install @capacitor/assets --save-dev
npx @capacitor/assets generate --ios

# Open iOS project in Xcode
npx cap open ios
```

---

## Step 2: Configure iOS Project in Xcode

### A. Basic App Information

1. Open `ios/App/App.xcodeproj` in Xcode
2. Select the "App" target
3. Go to "General" tab:
   - **Display Name**: `Masjid - Islamic Community`
   - **Bundle Identifier**: `com.islamicapp.community`
   - **Version**: `1.0.0` (matches Android)
   - **Build**: `1`
   - **Deployment Target**: iOS 13.0 or higher

### B. Signing & Capabilities

1. Go to "Signing & Capabilities" tab
2. Check "Automatically manage signing"
3. Select your **Team** (Apple Developer Account)
4. Add required capabilities:
   - Push Notifications
   - Background Modes (Remote notifications, Background fetch)
   - Associated Domains (if using deep links)

### C. App Icons

Icons should be auto-generated, but verify:
1. Go to `Assets.xcassets`
2. Click "AppIcon"
3. Ensure all required sizes are filled (20pt to 1024pt)

---

## Step 3: Build & Test

### Test on Simulator

```bash
# Build and run on iOS simulator
npx cap run ios
```

### Test on Physical Device

1. Connect iPhone/iPad via USB
2. In Xcode: Select your device from scheme selector
3. Click "Run" (▶️) button
4. First time: Trust developer certificate on device

---

## Step 4: Prepare for App Store Submission

### A. App Store Connect Setup

1. Go to: https://appstoreconnect.apple.com
2. Click "My Apps" → "+ New App"
3. Fill in app information:
   - **Platform**: iOS
   - **Name**: Masjid - Islamic Community
   - **Primary Language**: English
   - **Bundle ID**: com.islamicapp.community
   - **SKU**: masjid-islamic-community-001

### B. Required Screenshots

iOS requires screenshots for:
- 6.7" Display (iPhone 14 Pro Max): 1290 x 2796
- 6.5" Display (iPhone 11 Pro Max): 1242 x 2688
- 5.5" Display (iPhone 8 Plus): 1242 x 2208
- 12.9" iPad Pro: 2048 x 2732

Use our Screenshot Utility to generate these.

### C. App Information

Fill in App Store Connect:

**App Information:**
- **Subtitle**: Connect, Pray, Give - Islamic Community Platform
- **Category**: Lifestyle > Religion & Spirituality
- **Content Rights**: Include third-party content: No

**Privacy Policy URL:**
- Create a privacy policy (required!)
- Host on: [Your website or GitHub Pages]

**App Description:**
```
Masjid is your comprehensive Islamic community platform connecting Muslims worldwide. Features include:

📿 PRAYER & WORSHIP
• Live prayer services and lectures
• Consultation bookings with Islamic scholars
• Real-time streaming with scholars

💰 ZAKAT & CHARITY
• Send Zakat donations to verified scholars
• Support Islamic causes and community projects
• Transparent transaction history

🎥 LIVESTREAM & CONSULTATION
• Join live Islamic lectures and prayer sessions
• Book private consultations with certified scholars
• Interactive Q&A sessions

👥 COMMUNITY
• Connect with local mosques and Islamic centers
• Participate in community events
• Islamic calendar and prayer times

🔐 SECURE & VERIFIED
• Verified scholars and imams
• Secure payments via Paystack
• Privacy-focused design

Join thousands of Muslims using Masjid to strengthen their faith and connect with their community.
```

**Keywords:**
islam, muslim, mosque, masjid, prayer, zakat, quran, islamic, scholar, imam, halal, ramadan, charity

**Support URL:** [Your support email or website]

**Marketing URL:** [Optional]

### D. App Review Information

**Contact Information:**
- First Name: [Your name]
- Last Name: [Your name]
- Phone: [Your phone]
- Email: [Your email]

**Demo Account** (for App Review team):
- Username: demo@masjid.app
- Password: DemoPassword123!

**Notes for Reviewer:**
```
This app connects Islamic communities worldwide. 

To test main features:
1. Login with demo account provided
2. Browse active livestreams and prayer services
3. View scholar profiles and consultation booking system
4. Test Zakat donation flow (use test mode)

Payment integration uses Paystack (for Nigerian users primarily).
All financial transactions are handled securely.
```

---

## Step 5: Build for App Store

### Archive the App

In Xcode:
1. Select "Any iOS Device (arm64)" from scheme selector
2. Menu: Product → Archive
3. Wait for build to complete (5-10 minutes)
4. When Archive Organizer opens, select your archive
5. Click "Distribute App"
6. Choose "App Store Connect"
7. Follow the upload wizard

### Or use Command Line

```bash
# Update version and build number first
cd ios/App

# Build archive
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath ./build/App.xcarchive \
  clean archive

# Upload to App Store Connect
xcodebuild -exportArchive \
  -archivePath ./build/App.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ExportOptions.plist
```

---

## Step 6: Submit for Review

1. Go to App Store Connect
2. Select your app → Version → Submit for Review
3. Fill out:
   - Export Compliance: If no encryption → No
   - Advertising Identifier: No (unless you use ads)
   - Content Rights: Complete checklist
4. Click "Submit"

**Review Timeline:** Typically 24-72 hours

---

## Common Rejection Reasons & Solutions

### 1. Incomplete Demo Account
**Solution:** Provide working demo credentials that showcase all features

### 2. Missing Privacy Policy
**Solution:** Add privacy policy URL in App Store Connect and in-app settings

### 3. Payment Issues
**Solution:** Clearly explain Paystack integration in review notes. Include test mode.

### 4. Guideline 4.3 - Design Spam
**Solution:** Ensure app provides unique value, not just a website wrapper

### 5. Background Modes
**Solution:** Only enable background modes you actually use and explain why

---

## Post-Approval Checklist

- [ ] Update marketing materials with "Download on App Store" badge
- [ ] Monitor user reviews and ratings
- [ ] Prepare for future updates (increment version/build numbers)
- [ ] Set up TestFlight for beta testing
- [ ] Consider phased release strategy

---

## Versioning Strategy

When updating the app:

1. **Minor updates** (bug fixes): 1.0.1, 1.0.2
2. **Feature updates**: 1.1.0, 1.2.0
3. **Major updates**: 2.0.0, 3.0.0

Always increment build number for each submission!

---

## iOS-Specific Considerations

### Push Notifications

1. Enable in Apple Developer Portal:
   - Certificates, Identifiers & Profiles
   - Identifiers → Your App ID
   - Enable "Push Notifications"
   - Generate APNs certificates

2. Upload APNs key to Supabase:
   - Project Settings → Push Notifications
   - Upload .p8 key file

### Deep Links / Universal Links

If using deep links:
1. Add Associated Domains capability
2. Create `apple-app-site-association` file
3. Host on your domain's root

### Privacy Manifest (iOS 17+)

Create `PrivacyInfo.xcprivacy` with:
- Data collection practices
- Third-party SDKs used
- Tracking domains

---

## Cost Summary

- **Apple Developer Account**: $99/year
- **macOS hardware**: If you don't have one (optional - can use Mac rental services)
- **App Review**: FREE
- **In-App Purchases**: Apple takes 30% (for paid features)

---

## Timeline Estimate

- iOS setup & configuration: 2-4 hours
- Icon/screenshot generation: 1-2 hours
- TestFlight testing: 1-3 days
- App Review wait time: 1-3 days
- **Total**: ~1 week from start to App Store

---

## Resources

- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)

---

## Need Help?

If you encounter issues:
1. Check Xcode console for error messages
2. Search Apple Developer Forums
3. Review Capacitor iOS troubleshooting guide
4. Contact Apple Developer Support (included in membership)

---

**Remember**: The frontend code is already mobile-optimized. Most of the iOS setup is configuration, signing, and app store metadata!
