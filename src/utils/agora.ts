import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
  type IRemoteVideoTrack,
  type IRemoteAudioTrack,
} from 'agora-rtc-sdk-ng'

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || ''

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
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
  }

  async joinChannel(config: AgoraConfig, role: 'host' | 'audience' = 'audience'): Promise<void> {
    if (!this.client) throw new Error('Client not initialized')

    // Generate token from backend (or use null for testing)
    const { token, uid } = await generateAgoraToken(
      config.channel,
      String(config.uid),
      role
    )

    // Use null token if empty string is returned (for testing without token service)
    const finalToken = token === '' ? null : token

    await this.client.join(
      config.appId || APP_ID,
      config.channel,
      finalToken,
      uid
    )
  }

  async createLocalTracks(): Promise<LocalTracks> {
    try {
      console.log('→ Requesting device access...')
      
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
      // If function not deployed, use null token (works if Agora app security is disabled)
      console.warn('Token generation service unavailable, using null token for testing')
      return { 
        token: '', // null token
        uid: session.user.id 
      }
    }

    const data = await response.json()
    return { token: data.token, uid: data.uid }
  } catch (error) {
    // Network error or function not available - use null token for testing
    console.warn('Token generation failed, using null token for testing:', error)
    return { 
      token: '', // null token
      uid: session.user.id 
    }
  }
}
