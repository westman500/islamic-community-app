import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

/**
 * Initialize status bar with consistent emerald color
 * This ensures the status bar is always emerald (#059669) on both iOS and Android
 */
export async function initializeStatusBar() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Set status bar style to light (white text)
    await StatusBar.setStyle({ style: Style.Light });

    // Set background color to emerald
    await StatusBar.setBackgroundColor({ color: '#059669' });

    // Ensure status bar doesn't overlay the web view
    await StatusBar.setOverlaysWebView({ overlay: false });

    console.log('✅ Status bar initialized with emerald color');
  } catch (error) {
    console.error('Failed to initialize status bar:', error);
  }
}

/**
 * Show the status bar
 */
export async function showStatusBar() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.show();
  } catch (error) {
    console.error('Failed to show status bar:', error);
  }
}

/**
 * Hide the status bar
 */
export async function hideStatusBar() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('Failed to hide status bar:', error);
  }
}
