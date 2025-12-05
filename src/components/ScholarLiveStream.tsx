import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from './ProtectedRoute'
import { AgoraService } from '../utils/agora'
import { supabase } from '../utils/supabase/client'
import { Video, VideoOff, Mic, MicOff, Users, StopCircle } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare global {
  interface Window { Capacitor?: { isNativePlatform?: () => boolean } }
}

export const ScholarLiveStream: React.FC = () => {
  const { profile } = useAuth()
  const permissions = usePermissions()
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamTitle, setStreamTitle] = useState('')
  const [channelName, setChannelName] = useState('')
  const [streamId, setStreamId] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [error, setError] = useState('')
  const [previewReady, setPreviewReady] = useState(false)
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null)
  const [currentStreamData, setCurrentStreamData] = useState<any>(null)
  
  const agoraService = useRef<AgoraService | null>(null)
  const localVideoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (agoraService.current && isStreaming) {
        // Call cleanup without awaiting to allow immediate unmount
        handleStreamCleanup()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming])

  const handleStreamCleanup = async () => {
    try {
      if (streamId) {
        await supabase
          .from('streams')
          .update({
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('id', streamId)
      }
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  }

  // Play video preview when both track and ref are ready
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current && videoEnabled) {
      console.log('📹 Video ref and track ready, playing preview...')
      console.log('→ Video container:', localVideoRef.current)
      console.log('→ Video track:', localVideoTrack)
      try {
        localVideoTrack.play(localVideoRef.current)
        console.log('✅ Video track play() called successfully')
        setPreviewReady(true)
        console.log('✅ previewReady set to true - overlay should hide')
      } catch (playErr) {
        console.error('❌ Failed to play local video track:', playErr)
        setError('Unable to display camera preview. Please retry or check camera permissions.')
      }
    }
  }, [localVideoTrack, videoEnabled])

  const startStream = async () => {
    if (!streamTitle.trim()) {
      setError('Please enter a stream title')
      return
    }

    if (!permissions.canStream) {
      setError('You do not have permission to start a live stream')
      return
    }

    setError('')
    console.log('=== STARTING LIVESTREAM ===')

    try {
      // Verify authentication first
      if (!profile?.id) {
        throw new Error('Profile not loaded. Please refresh the page and try again.')
      }

      // Test Supabase connection first
      console.log('Testing Supabase connection...')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session. Please sign out and sign in again.')
      }
      console.log('✅ Session verified:', session.user.id)

      // Check for media devices support and secure context
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          throw new Error('Camera and microphone require HTTPS or localhost. Please use: http://localhost:5173/')
        }
        throw new Error('Camera and microphone are not supported on this device')
      }
      
      // Additional check for secure context
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('Camera access requires secure context. Please use: http://localhost:5173/')
      }

      // Create channel name
      const channel = `stream_${profile.id}_${Date.now()}`
      setChannelName(channel)
      console.log('Channel:', channel)
      console.log('User ID:', profile.id)

      // Initialize Agora
      console.log('Step 1: Initializing Agora service...')
      agoraService.current = new AgoraService()

      // Step 2: Create local tracks and start preview BEFORE joining
      console.log('Step 2: Requesting camera and microphone access...')
      const tracks = await agoraService.current.createLocalTracks()
      console.log('✅ Camera and microphone access granted')
      console.log('  Video track:', tracks.videoTrack?.getTrackLabel())
      console.log('  Audio track:', tracks.audioTrack?.getTrackLabel())
      
      // Store video track in state - useEffect will play it when ref is ready
      console.log('Step 3: Storing video track for preview...')
      if (tracks.videoTrack) {
        setLocalVideoTrack(tracks.videoTrack)
        console.log('✅ Video track stored, waiting for DOM ref to attach...')
      } else {
        console.warn('⚠️ No video track created')
      }

      // Show streaming UI while connecting so preview stays visible
      setIsStreaming(true)

      // Join channel (this will fetch token server-side)
      console.log('Step 4: Joining channel as host with user ID:', profile.id)
      const appId = import.meta.env.VITE_AGORA_APP_ID as string
      console.log('Using Agora App ID:', appId)
      
      // Validate App ID format before proceeding
      if (!appId || appId.length !== 32) {
        throw new Error(`Invalid App ID format. Expected 32 characters, got: ${appId?.length || 0}. Current value: ${appId}`)
      }
      
      // joined flag not used; remove to avoid lint/type errors
      try {
        console.log('→ Attempting to join channel WITHOUT TOKEN (App ID only mode)...')
        console.log('→ Using App ID:', appId)
        await agoraService.current.joinChannel({
          appId,
          channel,
          token: null, // No token needed - App ID only mode
          uid: 0,
        }, 'host')
        console.log('✅ Channel joined successfully!')
      } catch (joinError: any) {
        console.error('❌ Failed to join channel:', joinError)
        console.error('Error code:', joinError.code)
        console.error('Error message:', joinError.message)
        
        // Provide specific error messages based on error code
        if (joinError.code === 'INVALID_OPERATION' || joinError.code === 'CAN_NOT_GET_GATEWAY_SERVER') {
          throw new Error('Unable to connect to streaming service. Please check your internet connection and try again.')
        }
        
        if (joinError.code === 'CAN_NOT_GET_GATEWAY_SERVER' || joinError.message?.includes('CAN_NOT_GET_GATEWAY_SERVER')) {
          throw new Error(`🔧 STREAMING CONNECTION FAILED

Your Agora project requires tokens but token generation failed.

✅ SOLUTION (5 minutes):
1. Visit: https://console.agora.io
2. Find project: ${appId}
3. Go to Authentication → Select "App ID"
4. Save changes
5. Refresh and try streaming again

Why this works: Switches from token mode to simpler App ID mode for testing.`)
        }
        
        if (joinError.message?.includes('token') || joinError.message?.includes('invalid vendor key')) {
          throw new Error('Streaming authentication failed. The Agora project needs to be set to "App ID" mode (no token required). Please contact support.')
        }
        
        if (joinError.code === 'ERR_INVALID_APP_ID' || joinError.message?.includes('4096') || joinError.message?.includes('Invalid App ID')) {
          throw new Error(`App ID rejected by Agora servers. App ID: ${appId}. Possible issues:\n1. App ID not found in Agora Console\n2. Project not in "Testing" mode\n3. App ID contains typos\n\nPlease verify in Agora Console that this exact App ID exists and project is active.`)
        }
        
        // More specific error messages based on common issues
        if (joinError.message?.includes('network') || joinError.message?.includes('connect')) {
          throw new Error('Network connection error. Please check your internet connection and try again.')
        }
        
        if (joinError.message?.includes('security') || joinError.message?.includes('certificate')) {
          throw new Error('Agora security configuration error. Please ensure your project settings are correct.')
        }
        
        // Keep local preview alive on failure; do not tear down tracks here
        throw new Error(`Streaming failed: ${joinError.message || joinError.code || 'Unknown error'}. Check console for details.`)
      }

      // Publish tracks
      console.log('Step 5: Publishing tracks to channel...')
      await agoraService.current.publishTracks()
      console.log('✅ Live stream started successfully!')
      console.log('📢 Published tracks:')
      console.log('  - Video enabled:', tracks.videoTrack?.enabled)
      console.log('  - Audio enabled:', tracks.audioTrack?.enabled)
      console.log('  - Audio track label:', tracks.audioTrack?.getTrackLabel())

      // Listen for viewer joins/leaves
      agoraService.current.onUserJoined(async (user) => {
        setViewerCount((prev) => {
          const newCount = prev + 1
          console.log('👤 User joined:', user.uid, '- Total viewers:', newCount)
          
          // Update database viewer count
          if (streamData?.id) {
            supabase
              .from('streams')
              .update({ viewer_count: newCount })
              .eq('id', streamData.id)
              .then(() => console.log('✅ Database updated with viewer count:', newCount))
          }
          
          return newCount
        })
      })

      agoraService.current.onUserLeft(async (user) => {
        setViewerCount((prev) => {
          const newCount = Math.max(0, prev - 1)
          console.log('👋 User left:', user.uid, '- Total viewers:', newCount)
          
          // Update database viewer count
          if (streamData?.id) {
            supabase
              .from('streams')
              .update({ viewer_count: newCount })
              .eq('id', streamData.id)
              .then(() => console.log('✅ Database updated with viewer count:', newCount))
          }
          
          return newCount
        })
      })

      setIsStreaming(true)

      // Create stream record in database
      console.log('📝 Creating stream record in database...')
      console.log('  - Scholar ID:', profile?.id)
      console.log('  - Title:', streamTitle)
      console.log('  - Channel:', channel)
      
      const { data: streamData, error: streamError } = await supabase
        .from('streams')
        .insert({
          scholar_id: profile?.id,
          title: streamTitle,
          channel: channel,
          is_active: true,
          is_free: true,
          price: 0
        })
        .select()
        .single()

      if (streamError) {
        console.error('❌ Error creating stream record:', streamError)
        console.error('   Error details:', JSON.stringify(streamError, null, 2))
        setError(`Failed to create stream record: ${streamError.message}. Stream is live but may not be visible to viewers.`)
      } else {
        console.log('✅ Stream record created successfully')
        console.log('   Stream ID:', streamData.id)
        setStreamId(streamData.id)
        setCurrentStreamData(streamData)
      }

    } catch (err: any) {
      console.error('Error starting stream:', err)
      // Do NOT tear down local preview on join/publish failure; user can stop manually
      
      // Provide better error messages
      if (err.message?.includes('Authentication required') || err.message?.includes('Not authenticated')) {
        setError('Authentication error. Please sign out and sign back in, then try again.')
      } else if (err.message?.includes('token') || err.message?.includes('Token')) {
        setError('Failed to generate streaming token. Please check your internet connection and try again.')
      } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
        setError('Network error. Please check your internet connection and try again.')
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera and microphone access denied. Please allow permissions and try again.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera or microphone found. Please check your devices and try again.')
      } else if (err.message?.includes('constraint') || err.message?.includes('OverconstrainedError')) {
        setError('Camera or microphone is not compatible. Please try another device.')
      } else if (err.message?.includes('already in use')) {
        setError('Camera or microphone is already in use by another app. Please close other apps and try again.')
      } else {
        setError(err.message || 'Failed to start stream. Please try again.')
      }
    }
  }

  const stopStream = async () => {
    console.log('🛑 Stopping stream...')
    
    // Immediately update UI state
    setIsStreaming(false)
    setViewerCount(0)
    
    try {
      // Update database first (most critical)
      if (streamId) {
        console.log('📝 Updating stream in database:', streamId)
        const endTime = new Date().toISOString()
        
        // Update stream status immediately
        const { error: streamError } = await supabase
          .from('streams')
          .update({
            is_active: false,
            ended_at: endTime,
            viewer_count: 0
          })
          .eq('id', streamId)

        if (streamError) {
          console.error('❌ Error updating stream status:', streamError)
        } else {
          console.log('✅ Stream marked as inactive in database')
        }

        // Mark all participants as inactive (don't await, let it happen in background)
        supabase
          .from('stream_participants')
          .update({
            is_active: false,
            left_at: endTime
          })
          .eq('stream_id', streamId)
          .eq('is_active', true)
          .then(({ error }) => {
            if (error) console.error('❌ Error updating participants:', error)
            else console.log('✅ Participants marked as inactive')
          })
      }

      // Then cleanup Agora connection
      if (agoraService.current) {
        console.log('🔌 Disconnecting from Agora...')
        await agoraService.current.leaveChannel()
        agoraService.current = null
        console.log('✅ Disconnected from Agora')
      }

      // Reset state
      setChannelName('')
      setStreamId(null)
      setError('')
      
      console.log('✅ Stream stopped successfully')

    } catch (err: any) {
      console.error('❌ Error stopping stream:', err)
      setError(err.message || 'Failed to stop stream completely, but stream is marked as ended')
      // Still reset state even if there's an error
      setChannelName('')
      setStreamId(null)
    }
  }

  const toggleVideo = async () => {
    if (agoraService.current) {
      await agoraService.current.toggleVideo(!videoEnabled)
      setVideoEnabled(prev => !prev)
    }
  }

  const toggleAudio = async () => {
    if (agoraService.current) {
      await agoraService.current.toggleAudio(!audioEnabled)
      setAudioEnabled(prev => !prev)
    }
  }

  if (!permissions.canStream) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">
              Access Denied: Only scholars and imams can start live streams.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <MobileLayout title={isStreaming ? '🔴 Live Stream' : 'Start Live Stream'}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isStreaming ? '🔴 Live Stream' : 'Start Live Stream'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isStreaming ? (
            // Pre-stream setup
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Stream Title
                </label>
                <Input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="e.g., Friday Jummah Prayer, Tafsir Session..."
                  disabled={isStreaming}
                />
              </div>

              <div className="p-4 bg-secondary rounded-lg">
                <h3 className="font-semibold mb-2">Stream Information</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Your stream will be visible to all members</li>
                  <li>• Members can join and watch in real-time</li>
                  <li>• You can control your video and audio during the stream</li>
                  <li>• Click "Stop Stream" to end the broadcast</li>
                </ul>
              </div>



              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
                </div>
              )}

              <Button onClick={startStream} className="w-full" size="lg">
                Start Live Stream
              </Button>
            </div>
          ) : (
            // During stream
            <div className="space-y-4">
              {/* Stream info */}
              <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive rounded-lg">
                <div>
                  <p className="font-semibold text-lg">{streamTitle}</p>
                  <p className="text-sm text-muted-foreground">Channel: {channelName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-bold">{viewerCount}</span>
                  <span className="text-sm text-muted-foreground">viewers</span>
                </div>
              </div>

              {/* Video preview */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <div 
                  ref={localVideoRef} 
                  className="w-full h-full" 
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000'
                  }}
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <VideoOff className="h-16 w-16 text-white" />
                  </div>
                )}
                {/* Loading indicator for video setup */}
                {videoEnabled && !previewReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">Initializing camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stream controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={videoEnabled ? 'default' : 'destructive'}
                  size="lg"
                  onClick={toggleVideo}
                >
                  {videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                <Button
                  variant={audioEnabled ? 'default' : 'destructive'}
                  size="lg"
                  onClick={toggleAudio}
                >
                  {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={stopStream}
                  className="ml-4"
                >
                  <StopCircle className="h-5 w-5 mr-2" />
                  Stop Stream
                </Button>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </MobileLayout>
  )
}
