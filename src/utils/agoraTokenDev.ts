// Simple client-side Agora token generator for development
// Note: This should only be used for development/testing. Production should use server-side generation.

export function generateSimpleAgoraToken(appId: string, channel: string, uid: number): string {
  // For development, we'll create a simple token format
  // This is NOT secure for production but works for testing
  
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour
  
  // Create a simple payload (this is just for development)
  const payload = {
    iss: appId,
    exp: expiry,
    channel: channel,
    uid: uid
  }
  
  // Base64 encode the payload (not secure, just for development)
  const encodedPayload = btoa(JSON.stringify(payload))
  
  // Return a development token format
  return `dev_${appId}_${encodedPayload}`
}

// Check if we're in development mode
export function isDevelopmentMode(): boolean {
  return import.meta.env.DEV || window.location.hostname === 'localhost'
}