import { Capacitor } from '@capacitor/core'

/**
 * Check for app updates and prompt user to update if available
 * Uses native store update APIs for Android (Play Store) and iOS (App Store)
 */
export async function checkForAppUpdate(): Promise<void> {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('App update check skipped - not on native platform')
    return
  }

  try {
    const { AppUpdate } = await import('@capawesome/capacitor-app-update')
    
    // Get current app update info
    const result = await AppUpdate.getAppUpdateInfo()
    
    console.log('App Update Info:', result)
    
    // Check if update is available
    if (result.updateAvailability === 2) {
      // 2 = UPDATE_AVAILABLE
      console.log('Update available! Current:', result.currentVersionCode, 'Available:', result.availableVersionCode)
      
      // Check if it's an immediate update (critical) or flexible
      if (result.immediateUpdateAllowed) {
        // Start immediate update flow (blocks app usage until updated)
        await AppUpdate.performImmediateUpdate()
      } else if (result.flexibleUpdateAllowed) {
        // Start flexible update flow (downloads in background)
        await AppUpdate.startFlexibleUpdate()
        
        // Listen for update completion
        await AppUpdate.addListener('onFlexibleUpdateStateChange', async (state) => {
          if (state.installStatus === 4) {
            // 4 = DOWNLOADED - update is ready to install
            // Prompt user to restart the app to apply update
            const shouldRestart = window.confirm(
              'A new version of MasjidMobile has been downloaded. Restart now to apply the update?'
            )
            if (shouldRestart) {
              await AppUpdate.completeFlexibleUpdate()
            }
          }
        })
      }
    } else {
      console.log('App is up to date')
    }
  } catch (error) {
    console.error('Error checking for app update:', error)
  }
}

/**
 * Opens the app store page for the app
 * Useful as a fallback or for manual update prompts
 */
export async function openAppStore(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { AppUpdate } = await import('@capawesome/capacitor-app-update')
    await AppUpdate.openAppStore()
  } catch (error) {
    console.error('Error opening app store:', error)
    // Fallback: open store URL directly
    const platform = Capacitor.getPlatform()
    if (platform === 'android') {
      window.open('https://play.google.com/store/apps/details?id=com.masjidmobile.app', '_system')
    } else if (platform === 'ios') {
      // Replace with actual App Store ID when available
      window.open('https://apps.apple.com/app/masjidmobile/id123456789', '_system')
    }
  }
}
