import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
  type IRemoteVideoTrack,
  type IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || '6bc4256e9b5349f38d791a3c86b535a7'

export interface AgoraConfig {
  appId: string
  channel: string
  token: string | null
  uid: string | number
}

export interface LocalTracks {
  videoTrack: ICameraVideoTrack | null
  audioTrack: IMicrophoneAudioTrack | null
}

export class AgoraService {
  private client: IAgoraRTCClient | null = null
  private localTracks: LocalTracks = {
    videoTrack: null,
    audioTrack: null,
  }

  constructor() {
    // Enable debug logging for troubleshooting
    AgoraRTC.enableLogUpload()
    AgoraRTC.setLogLevel(0) // 0 = DEBUG, 1 = INFO, 2 = WARNING, 3 = ERROR
    
    this.client = AgoraRTC.createClient({ 
      mode: 'rtc', 
      codec: 'vp8',
      // Ensure compatibility with testing mode
      role: 'host' 
    })
    
    // Add event listeners for better debugging
    this.client.on('connection-state-change', (curState, revState) => {
      console.log(`Agora connection state changed from ${revState} to ${curState}`)
    })
    
    this.client.on('exception', (evt) => {
      console.error('Agora exception:', evt)
    })
  }

  async joinChannel(config: AgoraConfig, role: 'host' | 'audience' = 'audience'): Promise<void> {
    if (!this.client) throw new Error('Client not initialized')

    console.log('→ Joining Agora channel:', config.channel)
    
    const appId = config.appId || APP_ID
    const uid = config.uid || 0
    
    console.log('→ App ID:', appId)
    console.log('→ Channel:', config.channel)
    console.log('→ UID:', uid)

    // Validate App ID format
    if (!appId || appId.length !== 32) {
      throw new Error(`Invalid App ID format. Expected 32 characters, got: ${appId?.length || 0}`)
    }

    let token: string | null = null
    
    // First try App ID mode (no token) - most reliable for development
    console.log('→ Attempting App ID mode first (no token required)...')
    
    try {
      await this.client.join(appId, config.channel, null, uid)
      console.log('✅ Successfully joined Agora channel in App ID mode')
      return
    } catch (appIdError: any) {
      console.log('App ID mode failed:', appIdError.message)
      
      if (appIdError.message?.includes('dynamic use static key')) {
        console.log('→ Project requires token authentication, generating token...')
        
        // Try to get a token from Supabase edge function
        try {
          console.log('→ Fetching Agora token...')
          
          // Import supabase client
          const { supabase } = await import('../utils/supabase/client')
          
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('generate-agora-token', {
            body: {
              channelName: config.channel,
              uid: uid,
              role: role === 'host' ? 1 : 2, // 1 = publisher (host), 2 = subscriber (audience)
              expirationTimeInSeconds: 3600 // 1 hour
            }
          })
          
          if (tokenError) {
            console.warn('Token generation failed:', tokenError)
            console.log('→ Using provided fallback token')
            token = config.token || '007eJxTYHgqyP/Dzfzapm0SJ51VpjgxMs+8L2+17nKk8tfH72LyrrxWYDBMNE5Oskg1SjE0NDdJSTGwNE9NSU42tjAxM7O0ME40cGRRyGwIZGQwrdjBzMgAgSA+L4NvYnFWZopCbn5SZk4qAwMAWnsh1A=='
          } else {
            token = tokenData.token
            console.log('→ Fresh token generated successfully')
          }
        } catch (tokenError) {
          console.warn('Token service unavailable:', tokenError)
          console.log('→ Using provided fallback token')
          token = config.token || '007eJxTYHgqyP/Dzfzapm0SJ51VpjgxMs+8L2+17nKk8tfH72LyrrxWYDBMNE5Oskg1SjE0NDdJSTGwNE9NSU42tjAxM7O0ME40cGRRyGwIZGQwrdjBzMgAgSA+L/Dzfzapm0SJ51VpjgxMs+8L2+17nKk8tfH72LyrrxWYDBMNE5Oskg1SjE0NDdJSTGwNE9NSU42tjAxM7O0ME40cGRRyGwIZGQwrdjBzMgAgSA+L4NvYnFWZopCbn5SZk4qAwMAWnsh1A=='
        }
      } else {
        // Re-throw other errors
        throw appIdError
      }
    }

    // If we reach here, we need to join with a token
    console.log('→ Token mode:', token ? 'Secure (with token)' : 'No token available')
    
    if (!token) {
      throw new Error('Token authentication required but no valid token available. Please check Agora project settings or deploy token generation service.')
    }

    try {
      await this.client.join(appId, config.channel, token, uid)
      console.log('✅ Successfully joined Agora channel with token')
    } catch (error: any) {
      console.error('❌ Agora join error with token:', error)
      
      // Provide better error messages for common issues
      if (error.code === 'INVALID_VENDOR_KEY' || error.code === 'ERR_INVALID_APP_ID') {
        throw new Error('Invalid Agora App ID. Please check your configuration.')
      }
      if (error.code === 'CAN_NOT_GET_GATEWAY_SERVER') {
        if (error.message?.includes('invalid token')) {
          throw new Error('Agora token is invalid or expired. Please check token generation service or Agora App Certificate.')
        }
        if (error.message?.includes('dynamic use static key')) {
          throw new Error('Agora project requires secure mode. Token generation service may need to be deployed or project switched to "App ID" authentication.')
        }
        throw new Error('Cannot connect to Agora servers. Please check your internet connection.')
      }
      if (error.code === 'INVALID_OPERATION') {
        throw new Error('Invalid operation. Please check your Agora project authentication settings.')
      }
      
      throw error
    }
  }

  async createLocalTracks(): Promise<LocalTracks> {
    try {
      console.log('→ Requesting device access...')
      
      // For native apps, request permissions using Capacitor
      if (window.Capacitor?.isNativePlatform()) {
        console.log('→ Requesting native permissions via Capacitor...')
        try {
          const { Camera } = await import('@capacitor/camera')
          const result = await Camera.requestPermissions({ permissions: ['camera'] })
          console.log('Capacitor camera permission result:', result)
        } catch (capError) {
          console.warn('Capacitor Camera plugin unavailable:', capError)
        }
      }
      
      // Use simpler config for better compatibility
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          // Audio settings
          AEC: true,
          AGC: true,
          ANS: true,
        },
        {
          // Video settings - optimized for mobile
          encoderConfig: '480p_1',
          facingMode: 'user',
        }
      )
      
      console.log('→ Devices accessed successfully')
      console.log('  Audio track:', audioTrack.getTrackLabel())
      console.log('  Video track:', videoTrack.getTrackLabel())
      
      // Verify tracks are active
      if (!audioTrack.enabled) {
        console.warn('Audio track not enabled, enabling...')
        await audioTrack.setEnabled(true)
      }
      if (!videoTrack.enabled) {
        console.warn('Video track not enabled, enabling...')
        await videoTrack.setEnabled(true)
      }
      
      this.localTracks = { audioTrack, videoTrack }
      return this.localTracks
    } catch (error: any) {
      console.error('→ Device access failed:', error)
      
      // Specific error handling
      if (error.name === 'NotAllowedError' || error.code === 'PERMISSION_DENIED') {
        throw new Error('Permission denied for camera or microphone')
      } else if (error.name === 'NotFoundError' || error.code === 'DEVICE_NOT_FOUND') {
        throw new Error('Camera or microphone not found')
      } else if (error.name === 'NotReadableError' || error.code === 'DEVICE_BUSY') {
        throw new Error('Camera or microphone is already in use')
      } else {
        throw new Error(error.message || 'Failed to access camera/microphone')
      }
    }
  }

  async publishTracks(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized')
    
    const tracks = []
    if (this.localTracks.audioTrack) tracks.push(this.localTracks.audioTrack)
    if (this.localTracks.videoTrack) tracks.push(this.localTracks.videoTrack)

    if (tracks.length > 0) {
      await this.client.publish(tracks)
    }
  }

  async leaveChannel(): Promise<void> {
    if (this.localTracks.audioTrack) {
      this.localTracks.audioTrack.stop()
      this.localTracks.audioTrack.close()
    }
    if (this.localTracks.videoTrack) {
      this.localTracks.videoTrack.stop()
      this.localTracks.videoTrack.close()
    }

    await this.client?.leave()
  }

  onUserJoined(callback: (user: IAgoraRTCRemoteUser) => void): void {
    this.client?.on('user-joined', callback)
  }

  onUserLeft(callback: (user: IAgoraRTCRemoteUser) => void): void {
    this.client?.on('user-left', callback)
  }

  onUserPublished(
    callback: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void
  ): void {
    this.client?.on('user-published', callback)
  }

  async subscribeToUser(
    user: IAgoraRTCRemoteUser,
    mediaType: 'audio' | 'video'
  ): Promise<IRemoteVideoTrack | IRemoteAudioTrack> {
    if (!this.client) throw new Error('Client not initialized')
    await this.client.subscribe(user, mediaType)
    return mediaType === 'video' ? user.videoTrack! : user.audioTrack!
  }

  getLocalTracks(): LocalTracks {
    return this.localTracks
  }

  getClient(): IAgoraRTCClient | null {
    return this.client
  }

  async toggleAudio(): Promise<boolean> {
    if (this.localTracks.audioTrack) {
      await this.localTracks.audioTrack.setEnabled(
        !this.localTracks.audioTrack.enabled
      )
      return this.localTracks.audioTrack.enabled
    }
    return false
  }

  async toggleVideo(): Promise<boolean> {
    if (this.localTracks.videoTrack) {
      await this.localTracks.videoTrack.setEnabled(
        !this.localTracks.videoTrack.enabled
      )
      return this.localTracks.videoTrack.enabled
    }
    return false
  }
}

export const generateAgoraToken = async (
  channelName: string,
  _uid: string,
  role: 'host' | 'audience'
): Promise<{ token: string; uid: string }> => {
  // Import supabase client directly
  const { supabase } = await import('./supabase/client')
  
  // Get current session with retry
  let session = null
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      session = data.session
      break
    }
    // Wait a bit before retry
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  if (!session) {
    throw new Error('Authentication required. Please sign in and try again.')
  }
  
  console.log('Generating Agora token with session:', session.user.id)

  // For development/testing: Use null token (requires Agora project to allow it)
  // In production, you would call the backend function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  
  try {
    // Try to call backend function to generate token
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-agora-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          channelName,
          role,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('⚠️ Token generation service unavailable:', response.status, errorText)
      console.log('Using Agora without token (App ID-only mode)')
      // Use App ID-only mode (no token) - works if Agora project has "App ID" authentication enabled
      return { 
        token: '', 
        uid: session.user.id 
      }
    }

    const data = await response.json()
    console.log('✅ Token generated successfully')
    return { token: data.token, uid: data.uid }
  } catch (error) {
    console.warn('⚠️ Token generation failed:', error)
    console.log('Using Agora without token (App ID-only mode)')
    // Fallback: Use App ID-only mode
    return { 
      token: '', 
      uid: session.user.id 
    }
  }
}
