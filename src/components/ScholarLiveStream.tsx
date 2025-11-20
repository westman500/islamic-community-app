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
import { Capacitor } from '@capacitor/core'

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
  
  const agoraService = useRef<AgoraService | null>(null)
  const localVideoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (agoraService.current && isStreaming) {
        stopStream()
      }
    }
  }, [])

  // Request camera and microphone permissions explicitly
  const requestMediaPermissions = async () => {
    try {
      console.log('🔐 Requesting camera and microphone access...')
      
      // Request actual access to camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      console.log('✅ Camera and microphone access granted')
      console.log('Video track:', stream.getVideoTracks()[0]?.label)
      console.log('Audio track:', stream.getAudioTracks()[0]?.label)
      
      // Stop the test stream - Agora will create its own
      stream.getTracks().forEach(track => track.stop())
      console.log('Test stream stopped, ready for Agora')
      
      return true
    } catch (err: any) {
      console.error('❌ Permission error:', err)
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('📷 Camera/microphone permission denied. Please allow access and try again.')
      } else if (err.name === 'NotFoundError') {
        throw new Error('📷 No camera or microphone found on this device.')
      } else if (err.name === 'NotReadableError') {
        throw new Error('⚠️ Camera or microphone is already in use by another app.')
      } else {
        throw new Error(err.message || 'Failed to access camera/microphone')
      }
    }
  }

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
      // Check for media devices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera and microphone are not supported on this device')
      }

      // Request camera and microphone permissions first
      console.log('Step 0: Requesting permissions...')
      await requestMediaPermissions()
      console.log('✅ Permissions granted, proceeding with stream setup')

      // Create channel name
      const channel = `stream_${profile?.id}_${Date.now()}`
      setChannelName(channel)
      console.log('Channel:', channel)

      // Initialize Agora
      console.log('1. Initializing Agora service...')
      agoraService.current = new AgoraService()

      // Join channel first
      console.log('2. Joining channel as host...')
      await agoraService.current.joinChannel({
        appId: import.meta.env.VITE_AGORA_APP_ID || '',
        channel,
        token: null,
        uid: profile?.id || '',
      }, 'host')
      console.log('✓ Channel joined')

      // Create local tracks (Agora will request permissions)
      console.log('3. Creating camera and microphone tracks...')
      const tracks = await agoraService.current.createLocalTracks()
      console.log('✓ Tracks created:', { 
        video: !!tracks.videoTrack, 
        audio: !!tracks.audioTrack 
      })
      
      // Play local video
      if (tracks.videoTrack && localVideoRef.current) {
        console.log('4. Playing local video preview...')
        tracks.videoTrack.play(localVideoRef.current)
        console.log('✓ Video playing')
      }

      // Publish tracks
      console.log('5. Publishing tracks to channel...')
      await agoraService.current.publishTracks()
      console.log('✓ Tracks published')

      // Listen for viewer joins/leaves
      agoraService.current.onUserJoined((user) => {
        setViewerCount((prev) => prev + 1)
        console.log('User joined:', user.uid)
      })

      agoraService.current.onUserLeft((user) => {
        setViewerCount((prev) => Math.max(0, prev - 1))
        console.log('User left:', user.uid)
      })

      setIsStreaming(true)

      // Create stream record in database
      const { data: streamData, error: streamError } = await supabase
        .from('streams')
        .insert({
          scholar_id: profile?.id,
          title: streamTitle,
          channel,
          is_active: true,
          is_free: true,
          price: 0
        })
        .select()
        .single()

      if (streamError) {
        console.error('Error creating stream record:', streamError)
      } else {
        setStreamId(streamData.id)
      }

    } catch (err: any) {
      console.error('Error starting stream:', err)
      
      // Clean up on error
      if (agoraService.current) {
        try {
          await agoraService.current.leaveChannel()
        } catch (cleanupErr) {
          console.error('Error during cleanup:', cleanupErr)
        }
        agoraService.current = null
      }
      
      // Provide better error messages
      if (err.message?.includes('token') || err.message?.includes('Token')) {
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
    try {
      if (agoraService.current) {
        await agoraService.current.leaveChannel()
        agoraService.current = null
      }

      // Update stream record in database
      if (streamId) {
        await supabase
          .from('streams')
          .update({
            is_active: false,
            ended_at: new Date().toISOString()
          })
          .eq('id', streamId)

        // Mark all participants as inactive
        await supabase
          .from('stream_participants')
          .update({
            is_active: false,
            left_at: new Date().toISOString()
          })
          .eq('stream_id', streamId)
          .eq('is_active', true)
      }

      setIsStreaming(false)
      setViewerCount(0)
      setChannelName('')
      setStreamId(null)

    } catch (err: any) {
      console.error('Error stopping stream:', err)
      setError(err.message || 'Failed to stop stream')
    }
  }

  const toggleVideo = async () => {
    if (agoraService.current) {
      const enabled = await agoraService.current.toggleVideo()
      setVideoEnabled(enabled)
    }
  }

  const toggleAudio = async () => {
    if (agoraService.current) {
      const enabled = await agoraService.current.toggleAudio()
      setAudioEnabled(enabled)
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
                  <p className="text-sm text-destructive">{error}</p>
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
                <div ref={localVideoRef} className="w-full h-full" />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <VideoOff className="h-16 w-16 text-white" />
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
