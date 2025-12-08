# Screenshot Utility Guide

## Overview
The Screenshot Utility is a development-only tool that automatically captures app screens in the exact dimensions required for Apple App Store and Google Play Store uploads.

## Features
- ✅ Captures screens in App Store compliant sizes
- ✅ Supports iPhone 6.7", 6.5", 5.5" displays
- ✅ Supports Android phones (1080p) and tablets (7" & 10")
- ✅ Downloads as PNG files ready for upload
- ✅ Only appears in development mode (not in production builds)

## How to Use

### 1. Start Development Server
```powershell
npm run dev
```
Access at: http://localhost:5173

### 2. Screenshot Utility Location
Look for the **floating panel** in the bottom-right corner of the screen with a camera icon.

### 3. Capture Options

#### Option A: Capture Current Screen
1. Navigate to the screen you want to capture
2. Click **"Current"** button in the utility panel
3. Screenshot will download automatically

#### Option B: Capture All Screens
1. Click **"All Screens"** button
2. Utility will automatically capture all 12 configured screens
3. All screenshots download to your Downloads folder

### 4. Select Target Size
Use the dropdown to choose:
- **iPhone 6.7"** (1290×2796) - iPhone 14 Pro Max, iPhone 15 Pro Max
- **iPhone 6.5"** (1242×2688) - iPhone XS Max, iPhone 11 Pro Max
- **iPhone 5.5"** (1242×2208) - iPhone 8 Plus
- **Android Phone** (1080×1920) - Standard Android (16:9)
- **Android Tablet 7"** (1200×1920)
- **Android Tablet 10"** (1600×2560)

## Screens Included

### Member Screens (4)
1. **Dashboard** - Home with prayer times and quick access
2. **Available Scholars** - Browse online scholars/imams
3. **Masjid Coin Wallet** - Digital wallet with deposits
4. **Consultation Booking** - Book sessions with scholars

### Scholar/Imam Screens (4)
5. **Scholar Dashboard** - Earnings and upcoming sessions
6. **Scholar Profile Settings** - Availability, fees, specializations
7. **Scholar Wallet** - Earnings and withdrawals
8. **Scholar Livestream** - Live streaming interface

### Universal Screens (4)
9. **Quran Reader** - Digital Quran with translations
10. **Prayer Times** - Location-based prayer schedule
11. **Qibla Direction** - Compass to Mecca
12. **Zakat Donation** - Islamic charitable giving

## File Naming Convention
Screenshots are named automatically:
```
{Screen_Name}_{Device_Size}.png
```

Examples:
- `Dashboard_Android_Phone.png`
- `Available_Scholars_iPhone_6.7".png`
- `Masjid_Coin_Wallet_Android_Tablet_7".png`

## Best Practices

### For App Store Submissions

**Apple App Store Requirements:**
- Minimum: 2 screenshots per device size
- Maximum: 10 screenshots per device size
- Recommended: 4-6 screenshots highlighting key features
- Format: PNG or JPEG
- Required sizes:
  - iPhone 6.7" Display: 1290 x 2796 pixels
  - iPhone 6.5" Display: 1242 x 2688 pixels
  
**Google Play Store Requirements:**
- Minimum: 2 screenshots
- Maximum: 8 screenshots
- Recommended: 4-6 screenshots
- Format: PNG or JPEG (no alpha channel for PNG)
- Minimum dimension: 320px
- Maximum dimension: 3840px
- Recommended: 1080 x 1920 (16:9 portrait)

### Tips for Great Screenshots

1. **Clean State**: Clear any test data, use realistic content
2. **High Contrast**: Ensure text is readable on all backgrounds
3. **Feature Focus**: Highlight the most important features
4. **Consistent Theme**: Use same accounts/data across screenshots
5. **No Sensitive Data**: Avoid real phone numbers, emails, etc.

## Test Accounts for Screenshots

**Member Account:**
- Email: `welshman221@gmail.com`
- Shows: Booking consultations, wallet deposits, prayer times

**Scholar Account:**
- Email: `ssl4live@gmail.com`
- Shows: Availability toggle, earnings, livestream interface

## Production Builds

The Screenshot Utility is **automatically excluded** from production builds:
```typescript
const isDevelopment = import.meta.env.DEV
{isDevelopment && <ScreenshotUtility />}
```

This means:
- ✅ APK builds won't include it
- ✅ Production deployments won't show it
- ✅ No performance impact on end users

## Troubleshooting

### Screenshot is Blank
- Ensure you're on the correct route
- Check browser console for errors
- Try refreshing the page first

### Wrong Size/Cropped
- The utility scales content to fit target size
- Some responsive layouts may look different at various sizes
- For best results, resize browser window to approximate target size

### Can't See Utility Panel
- Utility only appears in development mode (npm run dev)
- Check bottom-right corner of screen
- Try scrolling down if page is tall

### Downloads Not Working
- Check browser download settings
- Ensure pop-ups/downloads are allowed
- Try clicking "Current" for one screen first

## Manual Screenshot Alternative

If automated tool doesn't work:
1. Resize browser window to target dimensions
2. Use browser's screenshot feature (F12 → Dev Tools → Capture screenshot)
3. Or use system screenshot tool (Windows: Win+Shift+S)

## App Store Upload Process

### Apple App Store Connect:
1. Log in to App Store Connect
2. Go to "My Apps" → Your App → App Store tab
3. Under "App Previews and Screenshots", select device size
4. Upload screenshots (drag & drop PNG files)
5. Arrange in desired order (most important first)

### Google Play Console:
1. Log in to Google Play Console
2. Go to your app → Store presence → Main store listing
3. Scroll to "Phone screenshots" section
4. Upload screenshots (2-8 images)
5. Optionally add 7" tablet and 10" tablet screenshots

## Support

For issues or questions:
- Check browser console for errors
- Verify you're in development mode
- Ensure html2canvas library is installed: `npm list html2canvas`
- Contact dev team with console logs

---

**Last Updated:** December 8, 2025
**Compatible With:** Vite 5.4.21, React 18, Capacitor 7
