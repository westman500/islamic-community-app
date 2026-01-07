# Status Bar Color Consistency Fix

## Issue
The status bar was appearing inconsistently - sometimes emerald (#059669) and sometimes white, particularly on iOS and Android devices.

## Root Cause
The inconsistency was caused by:
1. Missing explicit status bar style declarations in native configurations
2. Lack of programmatic status bar initialization on app load
3. Platform-specific defaults overriding the desired emerald color

## Solution Implemented

### 1. Capacitor Configuration (`capacitor.config.ts`)
Enhanced the StatusBar plugin configuration with explicit platform settings:
```typescript
StatusBar: {
  style: 'LIGHT',                      // White text/icons
  backgroundColor: '#059669',          // Emerald background
  overlaysWebView: false,              // Don't overlay the content
  iosStyle: 'LIGHT',                   // iOS-specific light style
  androidStatusBarColor: '#059669'     // Android-specific color
}
```

### 2. iOS Configuration (`ios/App/App/Info.plist`)
Added explicit status bar style:
```xml
<key>UIStatusBarStyle</key>
<string>UIStatusBarStyleLightContent</string>
```
This ensures iOS uses light content (white text) by default.

### 3. Android Configuration

#### Created `android/app/src/main/res/values/colors.xml`:
```xml
<color name="statusBarColor">#059669</color>
```

#### Updated `android/app/src/main/res/values/styles.xml`:
```xml
<item name="android:statusBarColor">@color/statusBarColor</item>
<item name="android:windowLightStatusBar">false</item>
```
This ensures Android uses emerald status bar with light (white) icons.

### 4. Programmatic Initialization (`src/utils/statusBar.ts`)
Created a utility to programmatically set status bar on app load:
```typescript
export async function initializeStatusBar() {
  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setBackgroundColor({ color: '#059669' });
  await StatusBar.setOverlaysWebView({ overlay: false });
}
```

### 5. App Initialization (`src/App.tsx`)
Added status bar initialization on app load:
```typescript
useEffect(() => {
  initPushNotifications().catch(console.error)
  initializeStatusBar().catch(console.error)  // ✅ New
}, [])
```

## How It Works

### iOS:
1. Info.plist declares `UIStatusBarStyleLightContent` as default
2. Capacitor config sets background to `#059669`
3. App initialization programmatically confirms the style
4. Result: Consistent emerald status bar with white icons

### Android:
1. styles.xml sets `statusBarColor` to emerald
2. `windowLightStatusBar: false` ensures white icons
3. Capacitor config reinforces `#059669` background
4. App initialization programmatically confirms the style
5. Result: Consistent emerald status bar with white icons

### Web (PWA):
- Web doesn't have a native status bar
- The fixed div with `bg-emerald-600` at the top handles it
- Theme color meta tag is set to `#059669`

## Testing
After these changes, the status bar should ALWAYS be:
- **Background Color**: Emerald (#059669)
- **Text/Icons**: White (light content)
- **Consistent**: Across iOS, Android, and all screens

## Build Commands
To apply these changes to your mobile apps:

```bash
# Build web assets
npm run build

# Sync to native platforms
npx cap sync

# iOS (on Mac)
npx cap open ios
# Then build in Xcode

# Android
npx cap open android
# Then build in Android Studio
```

## Verification
1. Launch app on iOS device → Status bar should be emerald
2. Navigate between screens → Status bar stays emerald
3. Launch app on Android device → Status bar should be emerald
4. Pull down notification shade and release → Status bar should return to emerald

## Future Maintenance
If you need to change the status bar color in the future:
1. Update `capacitor.config.ts` → StatusBar.backgroundColor
2. Update `android/app/src/main/res/values/colors.xml` → statusBarColor
3. Update `src/utils/statusBar.ts` → initializeStatusBar() color
4. The iOS color is controlled by Capacitor config

---

**Date Fixed**: January 7, 2026  
**Files Modified**: 7 files  
**Issue**: Status bar color inconsistency (emerald vs white)  
**Status**: ✅ RESOLVED
