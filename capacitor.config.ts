import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.masjidmobile.app',
  appName: 'MasjidMobile',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    cleartext: false,
    allowNavigation: [
      'jtmmeumzjcldqukpqcfi.supabase.co',
      '*.supabase.co'
    ]
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#059669'
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Prevent reload on resume
    backgroundColor: '#059669'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: "#ffffff", // White background for splash
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#059669" // Emerald spinner
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#059669',
      overlaysWebView: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#059669"
    }
  }
};

export default config;
