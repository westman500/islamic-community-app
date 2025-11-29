import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { AgoraService } from '../utils/agora'
import { Users, Volume2, VolumeX, ThumbsUp, ThumbsDown, Heart } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'

interface ActiveStream {
  id: string
  channel: string
  title: string
  scholarName: string
  scholarId: string
  viewerCount: number
  startedAt: string
}

export const UserPrayerServiceViewer: React.FC = () => {
  const { profile } = useAuth()
  const { channelName } = useParams<{ channelName?: string }>()
  const navigate = useNavigate()
  
  console.log('UserPrayerServiceViewer loaded with channelName:', channelName)
  const [activeStreams, setActiveStreams] = useState<ActiveStream[]>([])
  const [selectedStream, setSelectedStream] = useState<ActiveStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [error, setError] = useState('')
  const [isAutoJoining, setIsAutoJoining] = useState(false)
  const [hasLiked, setHasLiked] = useState(false)
  const [hasDisliked, setHasDisliked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [dislikesCount, setDislikesCount] = useState(0)
  
  const agoraService = useRef<AgoraService | null>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)

  // Fetch active streams
  useEffect(() => {
    fetchActiveStreams()
    const interval = setInterval(fetchActiveStreams, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  // Poll viewer count and reactions when watching stream
  useEffect(() => {
    if (!selectedStream || !isConnected) return

    const pollStreamData = async () => {
      try {
        const { data: streamData, error: streamError } = await supabase
          .from('streams')
          .select('viewer_count, likes_count, dislikes_count')
          .eq('id', selectedStream.id)
          .maybeSingle()
        
        if (streamError) {
          console.error('Error polling stream data:', streamError)
          return
        }

        if (streamData) {
          setSelectedStream(prev => prev ? { ...prev, viewerCount: streamData.viewer_count || 0 } : null)
          setLikesCount(streamData.likes_count || 0)
          setDislikesCount(streamData.dislikes_count || 0)
        }

        // Check user's reaction
        if (profile) {
          const { data: reactionData } = await supabase
            .from('stream_reactions')
            .select('reaction_type')
            .eq('stream_id', selectedStream.id)
            .eq('user_id', profile.id)
            .maybeSingle()

          if (reactionData) {
            setHasLiked(reactionData.reaction_type === 'like')
            setHasDisliked(reactionData.reaction_type === 'dislike')
          }
        }
      } catch (err) {
        console.error('Error polling stream data:', err)
      }
    }

    pollStreamData() // Initial load
    const interval = setInterval(pollStreamData, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [selectedStream, isConnected, profile])

  // Auto-join stream if channelName provided in URL
  useEffect(() => {
    const autoJoinStream = async () => {
      if (!channelName || selectedStream || isAutoJoining) return
      
      console.log('Attempting to auto-join stream:', channelName)
      console.log('Active streams available:', activeStreams.length)
      
      setIsAutoJoining(true)
      
      // First, try to find in already loaded streams
      let stream = activeStreams.find(s => s.channel === channelName)
      
      // If not found, try fetching directly from database
      if (!stream && activeStreams.length === 0) {
        console.log('Stream not in list, fetching directly from database...')
        try {
          const { data: streamData, error: streamError } = await supabase
            .from('streams')
            .select(`
              id,
              channel,
              title,
              scholar_id,
              viewer_count,
              started_at,
              is_active,
              scholar:profiles!scholar_id(full_name)
            `)
            .eq('channel', channelName)
            .eq('is_active', true)
            .single()

          if (streamError) {
            console.error('Error fetching specific stream:', streamError)
          } else if (streamData) {
            console.log('Found stream in database:', streamData)
            stream = {
              id: streamData.id,
              channel: streamData.channel,
              title: streamData.title,
              scholarName: (streamData.scholar as any)?.full_name || 'Unknown Scholar',
              scholarId: streamData.scholar_id,
              viewerCount: streamData.viewer_count || 0,
              startedAt: streamData.started_at,
            }
          }
        } catch (err) {
          console.error('Error in direct stream fetch:', err)
        }
      }
      
      if (stream) {
        console.log('✅ Stream found, joining:', stream.title)
        await joinStream(stream)
      } else {
        console.warn('❌ Stream not found:', channelName)
        setError(`Stream "${channelName}" not found or has ended. The scholar may have stopped streaming.`)
      }
      
      setIsAutoJoining(false)
    }
    
    autoJoinStream()
  }, [channelName, activeStreams, selectedStream, isAutoJoining])

  const fetchActiveStreams = async () => {
    try {
      console.log('📡 Fetching active streams...')
      const { data: streamsData, error: streamsError } = await supabase
        .from('streams')
        .select(`
          id,
          channel,
          title,
          scholar_id,
          viewer_count,
          started_at,
          scholar:profiles!scholar_id(full_name)
        `)
        .eq('is_active', true)
        .order('started_at', { ascending: false })

      if (streamsError) {
        console.error('Error fetching streams:', streamsError)
        return
      }
      
      console.log(`✅ Found ${streamsData?.length || 0} active streams`)

      const formattedStreams: ActiveStream[] = (streamsData || []).map((stream: any) => ({
        id: stream.id,
        channel: stream.channel,
        title: stream.title,
        scholarName: stream.scholar?.full_name || 'Unknown Scholar',
        scholarId: stream.scholar_id,
        viewerCount: stream.viewer_count || 0,
        startedAt: stream.started_at,
      }))

      setActiveStreams(formattedStreams)
    } catch (err) {
      console.error('Error fetching streams:', err)
    }
  }

  const joinStream = async (stream: ActiveStream) => {
    setError('')
    setSelectedStream(stream)

    try {
      // Initialize Agora service
      agoraService.current = new AgoraService()

      // Join channel as audience (with token generation)
      await agoraService.current.joinChannel({
        appId: import.meta.env.VITE_AGORA_APP_ID || '',
        channel: stream.channel,
        token: null, // Token will be generated by joinChannel
        uid: 0, // Use 0 to let Agora assign UID automatically (matches token)
      }, 'audience') // Specify role as 'audience'

      // Subscribe to remote streams
      agoraService.current.onUserPublished(async (user, mediaType) => {
        try {
          console.log(`📺 Remote user published ${mediaType}:`, user.uid)
          await agoraService.current!.subscribeUser(user, mediaType)
          
          if (mediaType === 'video') {
            const videoTrack = agoraService.current!.getRemoteVideoTrack(user)
            if (videoTrack && remoteVideoRef.current) {
              console.log('▶️ Playing remote video track')
              videoTrack.play(remoteVideoRef.current)
            } else {
              console.warn('⚠️ No video track or container for remote user')
            }
          } else if (mediaType === 'audio') {
            const audioTrack = agoraService.current!.getRemoteAudioTrack(user)
            if (audioTrack) {
              console.log('🔊 Playing remote audio track through device speakers')
              
              // Play through device speakers (default audio output)
              // The play() method automatically uses the system's default audio output device
              await audioTrack.play()
              
              // Set maximum volume for clear audio
              audioTrack.setVolume(100)
              
              console.log('✅ Audio playing through device speakers at volume 100')
              console.log('📊 Audio track state:', {
                enabled: audioTrack.enabled,
                muted: audioTrack.muted,
                volumeLevel: audioTrack.getVolumeLevel()
              })
              
              // Verify device audio output
              console.log('🔊 System audio output: Using default device speakers')
              console.log('💡 If no sound, check:')
              console.log('  1. Device volume is up')
              console.log('  2. Browser has audio permission')
              console.log('  3. Correct audio output device selected in system settings')
            } else {
              console.warn('⚠️ No audio track available from remote user')
            }
          }
        } catch (err) {
          console.error('❌ Error subscribing to user:', err)
        }
      })

      setIsConnected(true)

      // Track participant in database
      await supabase.from('stream_participants').insert({
        stream_id: stream.id,
        user_id: profile?.id,
        is_active: true
      })

    } catch (err: any) {
      console.error('❌ Error joining stream:', err)
      
      let errorMessage = 'Failed to join stream. '
      
      if (err.message?.includes('INVALID_VENDOR_KEY') || err.message?.includes('invalid vendor key')) {
        errorMessage += 'Invalid Agora configuration. Please contact support.'
      } else if (err.message?.includes('token')) {
        errorMessage += 'Authentication error. Please try again.'
      } else if (err.message?.includes('network') || err.message?.includes('connection')) {
        errorMessage += 'Network connection issue. Check your internet and try again.'
      } else {
        errorMessage += err.message || 'Unknown error occurred.'
      }
      
      setError(errorMessage)
      setIsAutoJoining(false)
      setSelectedStream(null)
    }
  }

  const leaveStream = async () => {
    try {
      if (agoraService.current) {
        await agoraService.current.leaveChannel()
        agoraService.current = null
      }

      // Update participant record in database
      if (selectedStream) {
        await supabase
          .from('stream_participants')
          .update({
            is_active: false,
            left_at: new Date().toISOString()
          })
          .eq('stream_id', selectedStream.id)
          .eq('user_id', profile?.id)
          .eq('is_active', true)
      }

      setIsConnected(false)
      setSelectedStream(null)
      
    } catch (err: any) {
      console.error('Error leaving stream:', err)
      setError(err.message || 'Failed to leave stream')
    }
  }

  const toggleAudio = async () => {
    try {
      const newState = !audioEnabled
      setAudioEnabled(newState)
      
      // Mute/unmute all remote audio tracks
      if (agoraService.current) {
        const remoteUsers = agoraService.current.getRemoteUsers()
        for (const user of remoteUsers) {
          const audioTrack = user.audioTrack
          if (audioTrack) {
            if (newState) {
              await audioTrack.play()
              audioTrack.setVolume(100)
            } else {
              audioTrack.setVolume(0)
            }
          }
        }
      }
      
      console.log(newState ? '🔊 Audio enabled' : '🔇 Audio muted')
    } catch (err) {
      console.error('Error toggling audio:', err)
    }
  }

  const handleLike = async () => {
    if (!selectedStream || !profile) return
    
    try {
      if (hasLiked) {
        // Remove like
        await supabase
          .from('stream_reactions')
          .delete()
          .eq('stream_id', selectedStream.id)
          .eq('user_id', profile.id)
          .eq('reaction_type', 'like')
        
        setHasLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
        
        // Update stream likes count
        await supabase
          .from('streams')
          .update({ likes_count: Math.max(0, likesCount - 1) })
          .eq('id', selectedStream.id)
      } else {
        // Remove dislike if exists
        if (hasDisliked) {
          await supabase
            .from('stream_reactions')
            .delete()
            .eq('stream_id', selectedStream.id)
            .eq('user_id', profile.id)
            .eq('reaction_type', 'dislike')
          
          setHasDisliked(false)
          setDislikesCount(prev => Math.max(0, prev - 1))
          
          await supabase
            .from('streams')
            .update({ dislikes_count: Math.max(0, dislikesCount - 1) })
            .eq('id', selectedStream.id)
        }
        
        // Add like
        await supabase
          .from('stream_reactions')
          .insert({
            stream_id: selectedStream.id,
            user_id: profile.id,
            reaction_type: 'like'
          })
        
        setHasLiked(true)
        setLikesCount(prev => prev + 1)
        
        // Update stream likes count
        await supabase
          .from('streams')
          .update({ likes_count: likesCount + 1 })
          .eq('id', selectedStream.id)
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  const handleDislike = async () => {
    if (!selectedStream || !profile) return
    
    try {
      if (hasDisliked) {
        // Remove dislike
        await supabase
          .from('stream_reactions')
          .delete()
          .eq('stream_id', selectedStream.id)
          .eq('user_id', profile.id)
          .eq('reaction_type', 'dislike')
        
        setHasDisliked(false)
        setDislikesCount(prev => Math.max(0, prev - 1))
        
        // Update stream dislikes count
        await supabase
          .from('streams')
          .update({ dislikes_count: Math.max(0, dislikesCount - 1) })
          .eq('id', selectedStream.id)
      } else {
        // Remove like if exists
        if (hasLiked) {
          await supabase
            .from('stream_reactions')
            .delete()
            .eq('stream_id', selectedStream.id)
            .eq('user_id', profile.id)
            .eq('reaction_type', 'like')
          
          setHasLiked(false)
          setLikesCount(prev => Math.max(0, prev - 1))
          
          await supabase
            .from('streams')
            .update({ likes_count: Math.max(0, likesCount - 1) })
            .eq('id', selectedStream.id)
        }
        
        // Add dislike
        await supabase
          .from('stream_reactions')
          .insert({
            stream_id: selectedStream.id,
            user_id: profile.id,
            reaction_type: 'dislike'
          })
        
        setHasDisliked(true)
        setDislikesCount(prev => prev + 1)
        
        // Update stream dislikes count
        await supabase
          .from('streams')
          .update({ dislikes_count: dislikesCount + 1 })
          .eq('id', selectedStream.id)
      }
    } catch (err) {
      console.error('Error toggling dislike:', err)
    }
  }

  const handleZakat = () => {
    navigate('/masjid-coin')
  }

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (agoraService.current && isConnected) {
        leaveStream()
      }
    }
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Live Prayer Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && !selectedStream && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-md mb-4">
              <p className="text-sm text-destructive font-semibold">{error}</p>
              <Button 
                onClick={() => {
                  setError('')
                  window.history.back()
                }} 
                variant="outline" 
                className="mt-3"
              >
                Go Back
              </Button>
            </div>
          )}
          
          {isAutoJoining ? (
            // Auto-joining stream from URL
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg font-semibold">Connecting to stream...</p>
              <p className="text-sm text-muted-foreground mt-2">
                {channelName}
              </p>
            </div>
          ) : !selectedStream ? (
            // Stream selection
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Join live prayer services and Islamic lectures from our scholars and imams
              </p>

              {activeStreams.length === 0 && !channelName ? (
                <div className="text-center py-12 bg-secondary rounded-lg">
                  <p className="text-muted-foreground">
                    No live streams available at the moment
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back later for prayer times and lectures
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {activeStreams.map((stream) => (
                    <div
                      key={stream.id}
                      className="p-4 border rounded-lg hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                            <h3 className="font-semibold text-lg">{stream.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            by {stream.scholarName}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{stream.viewerCount} watching</span>
                            </div>
                            <span>
                              Started {new Date(stream.startedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <Button onClick={() => joinStream(stream)}>
                          Join Stream
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Watching stream
            <div className="space-y-4">
              {/* Stream info */}
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    <h3 className="font-semibold text-lg">{selectedStream.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    by {selectedStream.scholarName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-bold">{selectedStream.viewerCount}</span>
                </div>
              </div>

              {/* Video player */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <div ref={remoteVideoRef} className="w-full h-full" />
                {!isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p>Connecting to stream...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewer controls */}
              <div className="space-y-3">
                {/* Reactions */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant={hasLiked ? 'default' : 'outline'}
                    size="lg"
                    onClick={handleLike}
                    className="flex-1"
                  >
                    <ThumbsUp className="h-5 w-5 mr-2" />
                    {likesCount}
                  </Button>
                  <Button
                    variant={hasDisliked ? 'default' : 'outline'}
                    size="lg"
                    onClick={handleDislike}
                    className="flex-1"
                  >
                    <ThumbsDown className="h-5 w-5 mr-2" />
                    {dislikesCount}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleZakat}
                    className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <Heart className="h-5 w-5 mr-2" />
                    Zakat
                  </Button>
                </div>

                {/* Audio and leave controls */}
                <div className="flex items-center gap-3">
                  <Button
                    variant={audioEnabled ? 'default' : 'destructive'}
                    onClick={toggleAudio}
                    className="flex-1"
                  >
                    {audioEnabled ? (
                      <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Mute
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-4 w-4 mr-2" />
                        Unmute
                      </>
                    )}
                  </Button>
                  <Button variant="destructive" onClick={leaveStream} className="flex-1">
                    Leave Stream
                  </Button>
                </div>
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
    </div>
  )
}
