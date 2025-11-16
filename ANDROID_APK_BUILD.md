# 📱 ANDROID APK BUILD GUIDE

## Islamic Community Platform - Mobile App Build Instructions

---

## ✅ CAPACITOR SETUP COMPLETE

The project has been configured with Capacitor for mobile development:
- ✅ Capacitor Core installed
- ✅ Android platform added
- ✅ Web assets synced to Android project
- ✅ Configuration file created (capacitor.config.ts)

**App Details:**
- App Name: Islamic Community
- Package ID: com.masjid.app
- Android project location: `android/` folder

---

## 📋 PREREQUISITES FOR APK BUILD

### 1. Install Java Development Kit (JDK)

**Option A: Download from Oracle**
```
1. Go to: https://www.oracle.com/java/technologies/downloads/
2. Download JDK 17 or newer (LTS version recommended)
3. Install and note the installation path
4. Set JAVA_HOME environment variable:
   - Windows: C:\Program Files\Java\jdk-17
   - Path: C:\Program Files\Java\jdk-17\bin
```

**Option B: Using Chocolatey (Windows Package Manager)**
```powershell
choco install openjdk17
```

**Option C: Using Scoop**
```powershell
scoop install openjdk17
```

### 2. Install Android Studio (Recommended)

**Download and Install:**
```
1. Go to: https://developer.android.com/studio
2. Download Android Studio
3. Install with default settings
4. During setup, install:
   - Android SDK
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - Android Emulator (optional)
```

**Configure Environment Variables:**
```powershell
# Add to System Environment Variables:
ANDROID_HOME = C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT = C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk

# Add to Path:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

### 3. Alternative: Command-Line Tools Only

If you don't want Android Studio, install SDK tools separately:
```
1. Go to: https://developer.android.com/studio#command-line-tools-only
2. Download command line tools
3. Extract to: C:\Android\cmdline-tools
4. Set ANDROID_HOME environment variable
5. Install required SDK packages:
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

---

## 🔧 VERIFY INSTALLATION

After installing Java and Android SDK:

### Check Java
```powershell
java -version
# Should show: openjdk version "17.x.x" or similar

echo $env:JAVA_HOME
# Should show: C:\Program Files\Java\jdk-17
```

### Check Android SDK
```powershell
echo $env:ANDROID_HOME
# Should show: C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk

adb --version
# Should show: Android Debug Bridge version
```

### Check Gradle
```powershell
cd android
.\gradlew.bat --version
# Should show Gradle version information
```

---

## 🏗️ BUILD APK COMMANDS

Once prerequisites are installed, build the APK:

### Step 1: Ensure Latest Build
```powershell
# Navigate to project root
cd C:\Users\SUMMERHILL\masjid

# Rebuild web assets
npm run build

# Sync to Android
npx cap sync android
```

### Step 2: Build Debug APK
```powershell
# Navigate to Android folder
cd android

# Build debug APK
.\gradlew.bat assembleDebug

# APK location:
# android\app\build\outputs\apk\debug\app-debug.apk
```

### Step 3: Build Release APK (Signed)
```powershell
# Generate keystore (first time only)
keytool -genkey -v -keystore release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
.\gradlew.bat assembleRelease

# APK location:
# android\app\build\outputs\apk\release\app-release-unsigned.apk
```

---

## 🔐 SIGN RELEASE APK

### Create Key Configuration

Create `android/key.properties`:
```properties
storeFile=../release-key.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=my-key-alias
keyPassword=YOUR_KEY_PASSWORD
```

### Update build.gradle

Edit `android/app/build.gradle`:

```gradle
// Add before android block
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config
    
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Build Signed Release
```powershell
cd android
.\gradlew.bat assembleRelease

# Signed APK location:
# android\app\build\outputs\apk\release\app-release.apk
```

---

## 🚀 INSTALL APK ON DEVICE

### Option 1: Via USB
```powershell
# Enable USB debugging on Android device
# Connect device via USB

# Install APK
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Option 2: Share APK File
```powershell
# Copy APK from:
android\app\build\outputs\apk\debug\app-debug.apk

# Transfer to device and install
# (Enable "Install from Unknown Sources" in device settings)
```

### Option 3: Open in Android Studio
```powershell
# Open Android Studio
# File > Open > Select android folder
# Run > Run 'app'
```

---

## 📱 APP PERMISSIONS

The app requires these permissions (already configured in AndroidManifest.xml):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

To add permissions, edit: `android/app/src/main/AndroidManifest.xml`

---

## 🎨 CUSTOMIZE APP

### Change App Icon

1. Generate icons at https://icon.kitchen/
2. Download Android icon pack
3. Replace files in: `android/app/src/main/res/`
   - mipmap-hdpi/
   - mipmap-mdpi/
   - mipmap-xhdpi/
   - mipmap-xxhdpi/
   - mipmap-xxxhdpi/

### Change App Name

Edit `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">Islamic Community</string>
    <string name="title_activity_main">Islamic Community</string>
    <string name="package_name">com.masjid.app</string>
    <string name="custom_url_scheme">com.masjid.app</string>
</resources>
```

### Change Splash Screen

Edit `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: "#1e40af",
    showSpinner: false,
    androidScaleType: "CENTER_CROP",
    splashFullScreen: true,
    splashImmersive: true
  }
}
```

Add splash image: `android/app/src/main/res/drawable/splash.png`

---

## 🔄 UPDATE APP WORKFLOW

When you make changes to web code:

```powershell
# 1. Update web code in src/

# 2. Rebuild web assets
npm run build

# 3. Sync to Android
npx cap sync android

# 4. Rebuild APK
cd android
.\gradlew.bat assembleDebug

# 5. Install on device
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 📦 OPTIMIZE APK SIZE

### Enable ProGuard (Minification)

Edit `android/app/build.gradle`:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### Build App Bundle (Smaller)
```powershell
cd android
.\gradlew.bat bundleRelease

# Output: android\app\build\outputs\bundle\release\app-release.aab
# Upload .aab to Google Play Store (recommended)
```

---

## 🐛 TROUBLESHOOTING

### "JAVA_HOME not set"
```powershell
# Set temporarily
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"

# Set permanently (System Properties > Environment Variables)
# Add JAVA_HOME = C:\Program Files\Java\jdk-17
```

### "SDK location not found"

Create `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

### "Build failed: Gradle version"
```powershell
cd android
.\gradlew.bat wrapper --gradle-version 8.2.1
```

### "APK not installing"
```powershell
# Uninstall old version first
adb uninstall com.masjid.app

# Then reinstall
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### "Camera/Microphone not working"
```xml
<!-- Add to AndroidManifest.xml -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />
```

---

## 📊 APK INFORMATION

After building, check APK details:

```powershell
# APK size
dir android\app\build\outputs\apk\debug\app-debug.apk

# APK info
aapt dump badging android\app\build\outputs\apk\debug\app-debug.apk
```

**Expected Sizes:**
- Debug APK: ~30-50 MB
- Release APK (unoptimized): ~25-40 MB
- Release APK (optimized): ~15-25 MB
- App Bundle (.aab): ~10-20 MB

---

## 🎯 QUICK START (After Prerequisites)

```powershell
# Build APK in 3 commands:
npm run build
npx cap sync android
cd android; .\gradlew.bat assembleDebug

# Find APK at:
# android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 📱 PUBLISH TO GOOGLE PLAY

1. Build signed release .aab:
   ```powershell
   cd android
   .\gradlew.bat bundleRelease
   ```

2. Create Google Play Console account: https://play.google.com/console

3. Create new app listing

4. Upload app-release.aab

5. Fill in store listing details:
   - App name: Islamic Community
   - Description
   - Screenshots (phone, tablet)
   - Feature graphic
   - Icon

6. Set content rating, pricing, countries

7. Submit for review

---

## ✅ NEXT STEPS

1. **Install Java JDK 17+**
2. **Install Android Studio** (or SDK tools)
3. **Set environment variables** (JAVA_HOME, ANDROID_HOME)
4. **Run build commands**
5. **Test APK on device**

---

## 🎉 SUCCESS!

Once you complete the setup:
- ✅ You'll have a working Android APK
- ✅ App can be installed on any Android device
- ✅ All web features work in mobile app
- ✅ Camera, microphone, location permissions included
- ✅ Ready for Google Play Store

**Need help? Check Android documentation:**
- https://developer.android.com/
- https://capacitorjs.com/docs/android
