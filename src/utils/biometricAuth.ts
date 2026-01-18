/**
 * Biometric Authentication Utility
 * Supports Face ID, fingerprint, and other biometric methods
 */

import { Capacitor } from '@capacitor/core'
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric'

const SERVER_URL = 'masjid-mobile-app' // Unique identifier for credential storage

export interface BiometricCredentials {
  email: string
  password: string
}

/**
 * Check if biometric authentication is available on the device
 */
export const isBiometricAvailable = async (): Promise<{ available: boolean; biometryType: string }> => {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, biometryType: 'none' }
  }

  try {
    const result = await NativeBiometric.isAvailable()
    
    let biometryTypeName = 'Biometric'
    switch (result.biometryType) {
      case BiometryType.FACE_ID:
        biometryTypeName = 'Face ID'
        break
      case BiometryType.TOUCH_ID:
        biometryTypeName = 'Touch ID'
        break
      case BiometryType.FINGERPRINT:
        biometryTypeName = 'Fingerprint'
        break
      case BiometryType.FACE_AUTHENTICATION:
        biometryTypeName = 'Face Authentication'
        break
      case BiometryType.IRIS_AUTHENTICATION:
        biometryTypeName = 'Iris Authentication'
        break
      default:
        biometryTypeName = 'Biometric'
    }

    return {
      available: result.isAvailable,
      biometryType: biometryTypeName
    }
  } catch (error) {
    console.warn('Biometric check error:', error)
    return { available: false, biometryType: 'none' }
  }
}

/**
 * Save credentials securely for biometric login
 */
export const saveCredentialsForBiometric = async (email: string, password: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false
  }

  try {
    await NativeBiometric.setCredentials({
      username: email,
      password: password,
      server: SERVER_URL
    })
    
    // Mark that biometric is enabled
    localStorage.setItem('biometric-enabled', 'true')
    localStorage.setItem('biometric-email', email)
    
    console.log('✅ Credentials saved for biometric login')
    return true
  } catch (error) {
    console.error('Failed to save biometric credentials:', error)
    return false
  }
}

/**
 * Get stored credentials after biometric verification
 */
export const getBiometricCredentials = async (): Promise<BiometricCredentials | null> => {
  if (!Capacitor.isNativePlatform()) {
    return null
  }

  try {
    // First verify with biometrics
    await NativeBiometric.verifyIdentity({
      reason: 'Sign in to Masjid Mobile',
      title: 'Biometric Login',
      subtitle: 'Use Face ID or fingerprint to sign in',
      description: 'Touch the sensor or look at the camera to authenticate',
      negativeButtonText: 'Use Password'
    })

    // If verification successful, get credentials
    const credentials = await NativeBiometric.getCredentials({
      server: SERVER_URL
    })

    return {
      email: credentials.username,
      password: credentials.password
    }
  } catch (error) {
    console.warn('Biometric verification failed or cancelled:', error)
    return null
  }
}

/**
 * Check if biometric login is enabled for this user
 */
export const isBiometricEnabled = (): boolean => {
  return localStorage.getItem('biometric-enabled') === 'true'
}

/**
 * Get the email associated with biometric login
 */
export const getBiometricEmail = (): string | null => {
  return localStorage.getItem('biometric-email')
}

/**
 * Disable biometric login and remove stored credentials
 */
export const disableBiometric = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeBiometric.deleteCredentials({
        server: SERVER_URL
      })
    } catch (error) {
      console.warn('Failed to delete biometric credentials:', error)
    }
  }
  
  localStorage.removeItem('biometric-enabled')
  localStorage.removeItem('biometric-email')
}

/**
 * Prompt user to enable biometric after successful login
 */
export const promptEnableBiometric = async (email: string, password: string): Promise<boolean> => {
  const { available } = await isBiometricAvailable()
  
  if (!available) {
    return false
  }

  // Only prompt if not already enabled
  if (isBiometricEnabled()) {
    // Update credentials if already enabled
    return await saveCredentialsForBiometric(email, password)
  }

  // Save credentials for biometric login
  return await saveCredentialsForBiometric(email, password)
}
