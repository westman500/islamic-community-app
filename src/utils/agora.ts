import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
  type IRemoteVideoTrack,
  type IRemoteAudioTrack,
  AREAS,
} from 'agora-rtc-sdk-ng'

const APP_ID: string | undefined = import.meta.env.VITE_AGORA_APP_ID || '195fe587a4b84053aa0eff6ae05150b1'

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
    
    // Configure Agora to use North America data center
    AgoraRTC.setArea({
      areaCode: [AREAS.NORTH_AMERICA],
      excludedArea: AREAS.CHINA
    })
    
    console.log('AgoraRTC SDK version:', AgoraRTC.VERSION)
    console.log('Browser check:', AgoraRTC.checkSystemRequirements())
    console.log('Region configured: NORTH_AMERICA')
    
    this.client = AgoraRTC.createClient({ 
      mode: 'live', // Changed to 'live' for broadcasting
      codec: 'vp8',
      role: 'host' // Default role
    })
    
    console.log('Agora client created successfully')
    
    // Add event listeners for better debugging
    this.client.on('connection-state-change', (curState, revState) => {
      console.log(`Agora connection state changed from ${revState} to ${curState}`)
    })
    
    this.client.on('network-quality', (stats) => {
      console.log('Network quality:', stats)
    })
    
    this.client.on('exception', (evt) => {
      console.error('Agora exception:', evt)
    })
  }

  async joinChannel(config: AgoraConfig, role: 'host' | 'audience' = 'audience'): Promise<void> {
    if (!this.client) throw new Error('Client not initialized')

    console.log('→ Joining Agora channel:', config.channel)

    let appId = config.appId || APP_ID
    let uid: string | number = config.uid || 0

    console.log('→ App ID:', appId)
    console.log('→ Channel:', config.channel)
    console.log('→ UID:', uid)
    console.log('→ Role:', role)
    console.log('→ Environment:', window.location.hostname)
    console.log('→ Secure Context:', window.isSecureContext)

    // App ID validation
    if (!appId || typeof appId !== 'string' || appId.length !== 32 || !/^[a-f0-9]{32}$/i.test(appId)) {
      throw new Error(`Invalid App ID provided: ${appId}`)
    }
    console.log('✅ App ID validation passed')

    // Set client role
    try {
      await this.client.setClientRole(role === 'host' ? 'host' : 'audience')
      console.log(`→ Client role set to ${role}`)
    } catch (roleError: any) {
      console.warn('Failed to set client role:', roleError.message)
    }

    console.log('→ Joining channel WITHOUT TOKEN (App ID only mode)...')
    console.log('  - SDK version:', AgoraRTC.VERSION)
    console.log('  - Browser supported:', AgoraRTC.checkSystemRequirements())

    if (!navigator.onLine) {
      throw new Error('Offline: Please reconnect to the internet before starting the stream.')
    }

    // NO TOKEN MODE - Just use App ID
    console.log('→ Using App ID only mode (no token/certificate)')
    console.time('agora_join_no_token')
    try {
      await this.client.join(appId, config.channel, null, uid)
      console.timeEnd('agora_join_no_token')
      console.log('✅ Joined channel successfully (no token)')
      return
    } catch (joinError: any) {
      console.timeEnd('agora_join_no_token')
      console.error('❌ Join failed:', joinError)

      // Specific known error patterns
      const msg = joinError?.message || ''
      if (msg.includes('CAN_NOT_GET_GATEWAY_SERVER') || msg.includes('dynamic use static key')) {
        throw new Error('Streaming authentication failed: Project requires token (certificate enabled) but valid token was not accepted. Verify token generation server and project security mode match.')
      }
      if (msg.includes('NETWORK_TIMEOUT') || msg.includes('NETWORK_ERROR')) {
        throw new Error('Network instability prevented connecting to Agora. Please check DNS/firewall and retry.')
      }
      throw new Error(`Unable to connect to Agora: ${msg}`)
    }
  }

  async createLocalTracks(): Promise<LocalTracks> {
    try {
      console.log('→ Requesting device access...')
      
      // Check for secure context first
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires HTTPS or localhost. Current URL is not secure.')
      }
      
      // Use simpler config for better compatibility - Agora SDK handles all permissions
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          // Audio settings
          AEC: true,
          AGC: true,
          ANS: true,
        },
        {
          // Video settings - High quality for best viewing experience
          encoderConfig: '720p_2', // 1280x720 @ 30fps, 2130 Kbps
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
      console.error('Failed to create local tracks:', error)
      
      if (error.name === 'NotAllowedError') {
        throw new Error('🎥 Camera or microphone permission denied. Please:\n\n1. Click the camera/microphone icon in your browser address bar\n2. Select "Allow" for both camera and microphone\n3. Refresh the page and try again\n\nNote: HTTPS is required for camera access.')
      } else if (error.name === 'NotFoundError') {
        throw new Error('📷 No camera or microphone found. Please:\n\n1. Connect a camera/microphone device\n2. Check if other applications are using the camera\n3. Restart your browser\n4. Try again')
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('⚙️ Camera constraints not supported. Please:\n\n1. Try using a different camera\n2. Check camera resolution settings\n3. Update browser to latest version')
      } else if (error.name === 'NotReadableError') {
        throw new Error('📹 Camera is in use by another application. Please:\n\n1. Close other apps using the camera\n2. Restart your browser\n3. Try again')
      } else if (error.message?.includes('screen') || error.message?.includes('display')) {
        throw new Error('🖥️ Screen sharing unavailable. This may be due to:\n\n1. Browser security restrictions\n2. Screen sharing blocked by system\n3. Try using camera mode instead')
      } else {
        throw new Error(`❌ Failed to access camera/microphone: ${error.message}\n\nTroubleshooting:\n1. Check browser permissions\n2. Ensure HTTPS connection\n3. Try refreshing the page`)
      }
    }
  }

  async publishTracks(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized')
    if (!this.localTracks.videoTrack || !this.localTracks.audioTrack) {
      throw new Error('Local tracks not created')
    }

    console.log('→ Publishing local tracks...')
    await this.client.publish([this.localTracks.videoTrack, this.localTracks.audioTrack])
    console.log('✅ Local tracks published')
  }

  async unpublishTracks(): Promise<void> {
    if (!this.client) return
    if (!this.localTracks.videoTrack || !this.localTracks.audioTrack) return

    console.log('→ Unpublishing local tracks...')
    await this.client.unpublish([this.localTracks.videoTrack, this.localTracks.audioTrack])
    console.log('✅ Local tracks unpublished')
  }

  async leave(): Promise<void> {
    console.log('→ Leaving Agora channel...')
    
    // Stop and close local tracks
    if (this.localTracks.videoTrack) {
      this.localTracks.videoTrack.stop()
      this.localTracks.videoTrack.close()
      this.localTracks.videoTrack = null
    }
    
    if (this.localTracks.audioTrack) {
      this.localTracks.audioTrack.stop()
      this.localTracks.audioTrack.close()
      this.localTracks.audioTrack = null
    }
    
    // Leave channel
    if (this.client) {
      await this.client.leave()
      console.log('✅ Left Agora channel')
    }
  }

  // Backwards-compatible alias used by UI code
  async leaveChannel(): Promise<void> {
    await this.leave()
  }

  playVideoTrack(track: ICameraVideoTrack | IRemoteVideoTrack, container: HTMLElement): void {
    track.play(container)
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    if (this.localTracks.videoTrack) {
      await this.localTracks.videoTrack.setEnabled(enabled)
      console.log(`Video ${enabled ? 'enabled' : 'disabled'}`)
    }
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    if (this.localTracks.audioTrack) {
      await this.localTracks.audioTrack.setEnabled(enabled)
      console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`)
    }
  }

  getRemoteUsers(): IAgoraRTCRemoteUser[] {
    if (!this.client) return []
    return this.client.remoteUsers || []
  }

  onUserJoined(callback: (user: IAgoraRTCRemoteUser) => void): void {
    if (this.client) {
      this.client.on('user-joined', callback)
    }
  }

  onUserLeft(callback: (user: IAgoraRTCRemoteUser) => void): void {
    if (this.client) {
      this.client.on('user-left', callback)
    }
  }

  onUserPublished(callback: (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => void): void {
    if (this.client) {
      this.client.on('user-published', callback)
    }
  }

  onUserUnpublished(callback: (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio') => void): void {
    if (this.client) {
      this.client.on('user-unpublished', callback)
    }
  }

  async subscribeUser(user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio'): Promise<void> {
    if (this.client) {
      await this.client.subscribe(user, mediaType)
    }
  }

  async unsubscribeUser(user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio'): Promise<void> {
    if (this.client) {
      await this.client.unsubscribe(user, mediaType)
    }
  }

  getRemoteVideoTrack(user: IAgoraRTCRemoteUser): IRemoteVideoTrack | undefined {
    return user.videoTrack
  }

  getRemoteAudioTrack(user: IAgoraRTCRemoteUser): IRemoteAudioTrack | undefined {
    return user.audioTrack
  }

  /**
   * Comprehensive diagnostic method to check system capabilities
   */
  async runDiagnostics(): Promise<{
    cameras: boolean
    microphones: boolean
    screenShare: boolean
    networkConnectivity: boolean
    httpsConnection: boolean
    browserSupport: boolean
    diagnosticResults: string[]
  }> {
    const results: string[] = []
    const diagnostics = {
      cameras: false,
      microphones: false,
      screenShare: false,
      networkConnectivity: false,
      httpsConnection: false,
      browserSupport: false,
      diagnosticResults: results
    }

    // Check HTTPS
    diagnostics.httpsConnection = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    if (!diagnostics.httpsConnection) {
      results.push('❌ HTTPS required for camera/microphone access')
    } else {
      results.push('✅ HTTPS connection available')
    }

    // Check browser support
    diagnostics.browserSupport = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    if (!diagnostics.browserSupport) {
      results.push('❌ Browser does not support media devices')
    } else {
      results.push('✅ Browser supports media devices')
    }

    // Check available devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      const microphones = devices.filter(device => device.kind === 'audioinput')
      
      diagnostics.cameras = cameras.length > 0
      diagnostics.microphones = microphones.length > 0
      
      if (diagnostics.cameras) {
        results.push(`✅ ${cameras.length} camera(s) detected`)
      } else {
        results.push('❌ No cameras detected')
      }
      
      if (diagnostics.microphones) {
        results.push(`✅ ${microphones.length} microphone(s) detected`)
      } else {
        results.push('❌ No microphones detected')
      }
    } catch (error) {
      results.push(`⚠️ Could not enumerate devices: ${(error as Error).message}`)
    }

    // Check screen sharing capability
    try {
      if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
        diagnostics.screenShare = true
        results.push('✅ Screen sharing supported')
      } else {
        diagnostics.screenShare = false
        results.push('❌ Screen sharing not supported')
      }
    } catch (error) {
      results.push(`⚠️ Screen sharing check failed: ${(error as Error).message}`)
    }

    // Check network connectivity
    try {
      await fetch('https://jtmmeumzjcldqukpqcfi.supabase.co/rest/v1/', {
        method: 'HEAD',
        mode: 'no-cors'
      })
      diagnostics.networkConnectivity = true
      results.push('✅ Network connectivity to Supabase')
    } catch (error) {
      diagnostics.networkConnectivity = false
      results.push('❌ No network connectivity to Supabase')
    }

    return diagnostics
  }

  /**
   * Get user-friendly error message for token generation failures
   */
  static getTokenErrorMessage(error: any): string {
    if (!error) return 'Unknown token generation error'
    
    const message = error.message || error.toString()
    
    if (message.includes('Unauthorized') || message.includes('401')) {
      return '🔐 Authentication required. Please sign in to use livestreaming features.'
    }
    
    if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch')) {
      return '🌐 Network error. Please check your internet connection and try again.'
    }
    
    if (message.includes('Function not found')) {
      return '⚙️ Server configuration issue. Edge functions not deployed.'
    }
    
    if (message.includes('certificate')) {
      return '🔑 Server configuration issue. Missing authentication certificates.'
    }
    
    return `❌ Failed to generate streaming token: ${message}\n\nPlease check your internet connection and try again.`
  }
}