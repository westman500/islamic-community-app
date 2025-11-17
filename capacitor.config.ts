import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.islamicapp.community',
  appName: 'Masjid - Islamic Community',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false, // Set to false for production security
    allowNavigation: [
      'jtmmeumzjcldqukpqcfi.supabase.co',
      '*.supabase.co'
    ]
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false // Set to false for production
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: "#059669", // Emerald green
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#ffffff"
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
