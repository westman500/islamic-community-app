# iOS Simulator Build Guide

## ⚠️ Important
iOS simulator builds can **only** be created on macOS with Xcode installed. You're currently on Windows.

## Options for Testing Your iOS App

### Option 1: TestFlight (Recommended - Works on Windows)
Upload the existing .ipa file to TestFlight for real device testing:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Open **Transporter** app (on Mac) or use web upload
3. Upload: `build-latest/masjid-ios-v1.0.2-build37/App.ipa`
4. Install TestFlight on your iPhone
5. Test the app on real hardware

### Option 2: Build for Simulator (Requires Mac)
If you have access to a Mac:

```bash
# 1. Clone repository on Mac
git clone https://github.com/westman500/islamic-community-app.git
cd islamic-community-app

# 2. Install dependencies
npm install

# 3. Build web assets
npm run build

# 4. Sync to iOS
npx cap sync ios

# 5. Open in Xcode
npx cap open ios

# 6. In Xcode:
# - Select any iOS Simulator (iPhone 15, etc.)
# - Click Run (▶️) button
# - Or Product > Build For > Running

# 7. To create .app bundle for simulator:
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath ./build

# 8. Find and zip the .app file
cd build/Build/Products/Debug-iphonesimulator
zip -r ~/Desktop/MasjidApp-Simulator.zip App.app

# 9. Install on simulator
xcrun simctl install booted App.app
```

### Option 3: GitHub Actions (Cloud Mac)
Your GitHub Actions workflow already runs on macOS. You could modify it to also build simulator versions, but TestFlight is the recommended approach for testing.

## Current Build Info
- **Device IPA**: `build-latest/masjid-ios-v1.0.2-build37/App.ipa`
- **Version**: 1.0.2
- **Build**: 37
- **Includes**: New mosque icons, white screen fixes

## Next Steps
Use **TestFlight** to test on real iOS devices - it's the easiest and most reliable method from Windows.
