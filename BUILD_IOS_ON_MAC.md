# Build iOS IPA on Mac - Complete Guide

## Prerequisites
Your Windows build is ready! Now follow these steps on your Mac.

## Step 1: Transfer Project to Mac
1. Copy the entire `masjid` folder to your Mac
2. You can use AirDrop, USB drive, or Git

## Step 2: Install Required Tools on Mac

```bash
# Install Node.js (if not already installed)
# Download from: https://nodejs.org/

# Install CocoaPods
sudo gem install cocoapods

# Verify installations
node --version
npm --version
pod --version
```

## Step 3: Setup Project on Mac

```bash
# Navigate to project folder
cd ~/path/to/masjid

# Install dependencies
npm install

# The dist folder and iOS sync are already done from Windows
# Just install iOS dependencies
cd ios/App
pod install
cd ../..
```

## Step 4: Build IPA

### Option A: Using Xcode (Recommended)

1. Open the project in Xcode:
   ```bash
   open ios/App/App.xcworkspace
   ```

2. In Xcode:
   - Select "Any iOS Device (arm64)" or your connected device
   - Product → Archive
   - After archiving completes, click "Distribute App"
   - Choose "Ad Hoc" or "App Store Connect"
   - Follow the wizard to create IPA

### Option B: Command Line (Faster)

```bash
# Build for device (creates archive)
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

# Export IPA (replace TEAM_ID with your Apple Team ID)
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build \
  -exportOptionsPlist exportOptions.plist
```

Create `exportOptions.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>ad-hoc</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID_HERE</string>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
```

## Step 5: Verify Build

The IPA will be in `build/App.ipa`

## Important Notes

✅ **App Icons**: Already synced from `resources/AppIcons`
✅ **Web Build**: Already built and synced to iOS
✅ **Configuration**: Capacitor config is set correctly
✅ **Plugins**: All 4 Capacitor plugins configured

### White Screen Prevention
The following are already configured to prevent white screen:
- ✅ `webDir: 'dist'` in capacitor.config.ts
- ✅ Background color set to #059669 (emerald green)
- ✅ Server configuration with proper scheme
- ✅ Public folder correctly synced to iOS

## Troubleshooting

### If you see white screen:
1. Check Console in Safari Web Inspector (connect device, enable dev mode)
2. Verify `dist` folder is properly synced
3. Check `ios/App/App/public` contains all files from `dist`
4. Run `npx cap sync ios` again on Mac if needed

### Common Issues:

**Pod install fails:**
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
```

**Signing issues:**
- Open in Xcode
- Select App target → Signing & Capabilities
- Choose your team
- Xcode will auto-fix provisioning

## Build Version Info

- Version: 1.0.2
- Build Number: Auto-incremented (was 43, will be 44+)
- Bundle ID: com.masjidmobile.app

## Next Steps After Build

1. Test on device
2. Upload to TestFlight (if using App Store Connect)
3. Distribute to testers
