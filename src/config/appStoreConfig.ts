/**
 * App Store Configuration
 * 
 * This file contains the URLs for downloading the Masjid app
 * from the Apple App Store and Google Play Store.
 * 
 * Update these URLs once your app is published to the stores.
 */

export const APP_STORE_CONFIG = {
  // Apple App Store URL (LIVE)
  appStore: {
    url: 'https://apps.apple.com/us/app/masjidmobile/id6756876021',
    bundleId: 'com.masjidmobile.app',
    appId: '6756876021',
    promoCode: 'AX6ENN3FAPEA'
  },

  // Google Play Store URL (LIVE)
  playStore: {
    url: 'https://play.google.com/store/apps/details?id=com.masjidmobile.app',
    packageName: 'com.masjidmobile.app'
  },

  // QR Code Landing Page
  // This is the page users are directed to when scanning QR codes
  landingPage: {
    // For production, use your actual domain
    baseUrl: 'https://masjidmobile.live',
    // Path to the download page
    downloadPath: '/download.html'
  },

  // App Information
  appInfo: {
    name: 'MasjidMobile',
    tagline: 'Connect, Pray, Give',
    version: '1.1.0'
  }
};

/**
 * Get the full QR code URL for a session
 * @param {string} sessionCode - The unique session code
 * @returns {string} - Full URL for the QR code
 */
export function getQRCodeUrl(sessionCode) {
  return `${APP_STORE_CONFIG.landingPage.baseUrl}${APP_STORE_CONFIG.landingPage.downloadPath}?ref=${sessionCode}`;
}

/**
 * Get the appropriate store URL based on platform
 * @param {'ios' | 'android'} platform
 * @returns {string}
 */
export function getStoreUrl(platform) {
  return platform === 'ios' 
    ? APP_STORE_CONFIG.appStore.url 
    : APP_STORE_CONFIG.playStore.url;
}

export default APP_STORE_CONFIG;
