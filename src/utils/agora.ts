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

    // Generate token from backend
    const { token, uid } = await generateAgoraToken(
      config.channel,
      String(config.uid),
      role
    )

    await this.client.join(
      config.appId || APP_ID,
      config.channel,
      token,
      uid
    )
  }

  async createLocalTracks(): Promise<LocalTracks> {
    try {
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks()
      this.localTracks = { audioTrack, videoTrack }
      return this.localTracks
    } catch (error) {
      console.error('Error creating local tracks:', error)
      throw error
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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  
  // Get auth token from Supabase
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    supabaseUrl,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Not authenticated')
  }

  // Call backend function to generate token
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
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate token')
  }

  const data = await response.json()
  return { token: data.token, uid: data.uid }
}
