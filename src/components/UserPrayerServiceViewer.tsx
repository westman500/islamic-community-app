import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { AgoraService } from '../utils/agora'
import { Users, Volume2, VolumeX, ThumbsUp, ThumbsDown, Heart, Maximize, Minimize, PictureInPicture2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { FloatingReactions, triggerReaction } from './FloatingReactions'
import { ZakatModal } from './ZakatModal'
import { initializePaystackPayment, generatePaymentReference } from '../utils/paystack'
import { useNotification } from '../contexts/NotificationContext'

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
  const { showNotification } = useNotification()
  
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
  const [showZakatModal, setShowZakatModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPiP, setIsPiP] = useState(false)
  const [comments, setComments] = useState<Array<{id: string, message: string, user_name: string, created_at: string}>>([])
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  
  const agoraService = useRef<AgoraService | null>(null)
  const remoteVideoRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Fetch active streams and subscribe to realtime changes
  useEffect(() => {
    fetchActiveStreams()
    const interval = setInterval(fetchActiveStreams, 5000) // Refresh every 5 seconds
    
    // Subscribe to realtime stream updates
    const streamSubscription = supabase
      .channel('viewer-streams')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streams',
          filter: `is_active=eq.false`,
        },
        (payload: any) => {
          console.log('Stream ended detected:', payload)
          // If currently watching this stream, disconnect
          if (selectedStream && payload.new.id === selectedStream.id) {
            console.log('⚠️ Current stream ended by scholar, disconnecting...')
            leaveStream()
            setError('Stream has ended by the scholar')
          }
          // Refresh stream list
          fetchActiveStreams()
        }
      )
      .subscribe()
    
    return () => {
      clearInterval(interval)
      streamSubscription.unsubscribe()
    }
  }, [selectedStream])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Listen for picture-in-picture changes
  useEffect(() => {
    const handlePiPChange = () => {
      setIsPiP(!!document.pictureInPictureElement)
    }

    document.addEventListener('enterpictureinpicture', handlePiPChange)
    document.addEventListener('leavepictureinpicture', handlePiPChange)
    return () => {
      document.removeEventListener('enterpictureinpicture', handlePiPChange)
      document.removeEventListener('leavepictureinpicture', handlePiPChange)
    }
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
          console.log('📊 Polled viewer count:', streamData.viewer_count)
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

    // Immediate poll when connected (give scholar 500ms to update DB)
    setTimeout(() => pollStreamData(), 500)
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
      // Check internet connectivity
      if (!navigator.onLine) {
        console.warn('No internet connection')
        setError('No internet connection. Please check your network.')
        return
      }
      
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
        // Check if it's a network error
        if (streamsError.message?.includes('Failed to fetch') || streamsError.message?.includes('NetworkError')) {
          setError('Cannot connect to server. Please check your internet connection.')
        }
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

  const handleStreamPayment = async (stream: ActiveStream, fee: number) => {
    if (!profile?.id) {
      setError('Please login to access paid streams')
      return
    }

    const paymentReference = generatePaymentReference()
    const accessRecordId = crypto.randomUUID()

    try {
      // Create pending access record
      const { error: accessError } = await supabase
        .from('stream_access_payments')
        .insert({
          id: accessRecordId,
          stream_id: stream.id,
          user_id: profile.id,
          scholar_id: stream.scholarId,
          amount_paid: fee,
          payment_reference: paymentReference,
          payment_status: 'pending'
        })

      if (accessError) throw accessError

      // Initialize Paystack payment
      await initializePaystackPayment({
        email: profile.email || '',
        amount: fee,
        reference: paymentReference,
        metadata: {
          user_id: profile.id,
          transaction_type: 'donation',
          custom_fields: [
            { display_name: 'Stream ID', variable_name: 'stream_id', value: stream.id },
            { display_name: 'Scholar ID', variable_name: 'scholar_id', value: stream.scholarId }
          ]
        }
      })
      
      // Payment successful - webhook will handle database update
      showNotification(
        `Payment successful! ₦${fee} paid. Joining "${stream.title}"...`,
        'payment'
      )
      // Retry joining stream with bypass
      setTimeout(() => {
        joinStream(stream, true)
      }, 2000)
    } catch (err: any) {
      setError(`Payment error: ${err.message}`)
    }
  }

  const joinStream = async (stream: ActiveStream, bypassPayment = false) => {
    setError('')
    setSelectedStream(stream)

    try {
      // Check internet connectivity before joining
      if (!navigator.onLine) {
        throw new Error('No internet connection. Cannot join livestream.')
      }

      // Check if stream requires payment (fetch scholar's livestream_fee)
      const { data: scholarData, error: scholarError } = await supabase
        .from('profiles')
        .select('livestream_fee')
        .eq('id', stream.scholarId)
        .single()

      if (scholarError) {
        if (scholarError.message?.includes('Failed to fetch') || scholarError.message?.includes('NetworkError')) {
          throw new Error('Cannot connect to server. Please check your internet connection.')
        }
        throw scholarError
      }

      const livestreamFee = scholarData?.livestream_fee || 0

      // If stream requires payment and not bypassed, check if user has paid
      if (livestreamFee > 0 && !bypassPayment) {
        // Check if user has already paid for this stream
        const { data: accessData, error: accessError } = await supabase
          .from('stream_access_payments')
          .select('*')
          .eq('stream_id', stream.id)
          .eq('user_id', profile?.id)
          .eq('payment_status', 'success')
          .single()

        if (accessError && accessError.code !== 'PGRST116') { // PGRST116 = no rows
          throw accessError
        }

        // If no valid payment found, trigger payment flow
        if (!accessData) {
          await handleStreamPayment(stream, livestreamFee)
          return // Exit - payment flow will recall joinStream on success
        }
      }

      // Initialize Agora service
      agoraService.current = new AgoraService()

      // Join channel as audience (with retry logic for better stability)
      let joinAttempt = 0
      const maxJoinAttempts = 3
      let joinSuccess = false
      
      while (joinAttempt < maxJoinAttempts && !joinSuccess) {
        joinAttempt++
        console.log(`🔄 Join attempt ${joinAttempt}/${maxJoinAttempts}...`)
        
        try {
          await agoraService.current.joinChannel({
            appId: import.meta.env.VITE_AGORA_APP_ID || '',
            channel: stream.channel,
            token: null, // Token will be generated by joinChannel
            uid: 0, // Use 0 to let Agora assign UID automatically (matches token)
          }, 'audience') // Specify role as 'audience'
          
          joinSuccess = true
          console.log('✅ Successfully joined stream on attempt', joinAttempt)
          
        } catch (joinError: any) {
          console.error(`❌ Join attempt ${joinAttempt} failed:`, joinError)
          
          // On last attempt, throw appropriate error
          if (joinAttempt >= maxJoinAttempts) {
            // Check for actual network errors (not just Agora gateway issues)
            if (!navigator.onLine) {
              throw new Error('No internet connection. Please check your network and try again.')
            }
            
            // If it's a gateway error, it might be temporary
            if (joinError.code === 'CAN_NOT_GET_GATEWAY_SERVER') {
              throw new Error('Unable to connect to stream. The stream may have ended or there might be a temporary connection issue. Please try again.')
            }
            
            // For generic network errors, be more specific
            if (joinError.code === 'NETWORK_ERROR' || joinError.message?.includes('Failed to fetch')) {
              throw new Error('Connection failed. Please check your internet connection and try again.')
            }
            
            if (joinError.code === 'INVALID_OPERATION') {
              throw new Error('Stream connection error. Please refresh the page and try again.')
            }
            
            throw new Error(`Failed to join stream: ${joinError.message || 'Unknown error'}. Please try again.`)
          }
          
          // Wait a bit before retrying (exponential backoff)
          const retryDelay = joinAttempt * 1000 // 1s, 2s, etc.
          console.log(`⏳ Waiting ${retryDelay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }

      // Subscribe to remote streams
      agoraService.current.onUserPublished(async (user, mediaType) => {
        try {
          console.log(`📺 Remote user published ${mediaType}:`, user.uid)
          await agoraService.current!.subscribeUser(user, mediaType)
          
          if (mediaType === 'video') {
            // Wait for container to be ready
            await new Promise(resolve => setTimeout(resolve, 100))
            
            const videoTrack = agoraService.current!.getRemoteVideoTrack(user)
            if (videoTrack && remoteVideoRef.current) {
              console.log('▶️ Playing remote video track in container')
              
              // Ensure container is visible
              if (remoteVideoRef.current.style) {
                remoteVideoRef.current.style.width = '100%'
                remoteVideoRef.current.style.height = '100%'
              }
              
              // Play video with autoplay
              await videoTrack.play(remoteVideoRef.current, { fit: 'contain' })
              console.log('✅ Video track playing successfully')
            } else {
              console.error('❌ No video track or container:', { 
                hasTrack: !!videoTrack, 
                hasContainer: !!remoteVideoRef.current 
              })
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

      // Show success notification
      showNotification(
        `Successfully joined "${stream.title}" by ${stream.scholarName}`,
        'success'
      )

      // Track participant in database
      await supabase.from('stream_participants').insert({
        stream_id: stream.id,
        user_id: profile?.id,
        is_active: true
      })

      // Increment viewer count using database function
      await supabase.rpc('increment_viewer_count', { stream_uuid: stream.id })
      console.log('✅ Viewer count incremented for stream:', stream.id)

      // Load existing comments
      fetchComments(stream.id)

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
      console.log('🚪 Leaving stream...')
      
      const streamToLeave = selectedStream
      const userId = profile?.id
      
      // Cleanup Agora connection first
      if (agoraService.current) {
        try {
          await agoraService.current.leaveChannel()
          console.log('✅ Left Agora channel')
        } catch (agoraError) {
          console.error('⚠️ Error leaving Agora channel:', agoraError)
        }
        agoraService.current = null
      }

      // Update participant record in database
      if (streamToLeave && userId) {
        try {
          const { error } = await supabase
            .from('stream_participants')
            .update({
              is_active: false,
              left_at: new Date().toISOString()
            })
            .eq('stream_id', streamToLeave.id)
            .eq('user_id', userId)
            .eq('is_active', true)
          
          if (error) {
            console.error('⚠️ Error updating participant status:', error)
          } else {
            console.log('✅ Participant status updated')
          }

          // Decrement viewer count using database function
          await supabase.rpc('decrement_viewer_count', { stream_uuid: streamToLeave.id })
          console.log('✅ Viewer count decremented for stream:', streamToLeave.id)
        } catch (dbError) {
          console.error('⚠️ Database error:', dbError)
        }
      }

      // Reset state immediately
      setIsConnected(false)
      setSelectedStream(null)
      setError('')
      setComments([])
      setNewComment('')
      setAudioEnabled(true)
      
      console.log('✅ Successfully left stream - UI reset')
      
      // Show notification
      showNotification('Left the stream', 'success')
      
    } catch (err: any) {
      console.error('❌ Error leaving stream:', err)
      // Even on error, force cleanup
      setIsConnected(false)
      setSelectedStream(null)
      agoraService.current = null
      showNotification(err.message || 'Error leaving stream, but you have been disconnected', 'error')
    }
  }

  // Fetch comments for the stream
  const fetchComments = async (streamId: string) => {
    try {
      const { data, error } = await supabase
        .from('stream_comments')
        .select(`
          id,
          message,
          created_at,
          user_id,
          profiles:user_id (full_name)
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedComments = (data || []).map((comment: any) => ({
        id: comment.id,
        message: comment.message,
        user_name: comment.profiles?.full_name || 'Anonymous',
        created_at: comment.created_at
      }))

      setComments(formattedComments)
      
      // Scroll to bottom
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  // Send a new comment
  const sendComment = async () => {
    if (!newComment.trim() || !selectedStream || !profile) return

    setSendingComment(true)
    try {
      const { error } = await supabase
        .from('stream_comments')
        .insert({
          stream_id: selectedStream.id,
          user_id: profile.id,
          message: newComment.trim()
        })

      if (error) throw error

      setNewComment('')
      // Comment will be added via real-time subscription
    } catch (error) {
      console.error('Error sending comment:', error)
      showNotification('Failed to send comment', 'error')
    } finally {
      setSendingComment(false)
    }
  }

  // Subscribe to real-time comments
  useEffect(() => {
    if (!selectedStream) return

    console.log('🔔 Setting up real-time comments subscription for stream:', selectedStream.id)

    const commentsChannel = supabase
      .channel(`stream-comments:${selectedStream.id}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stream_comments',
          filter: `stream_id=eq.${selectedStream.id}`
        },
        async (payload) => {
          console.log('💬 New comment received via real-time:', payload.new)
          
          // Fetch the full comment with user info
          const { data } = await supabase
            .from('stream_comments')
            .select(`
              id,
              message,
              created_at,
              profiles:user_id (full_name)
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            const newComment = {
              id: data.id,
              message: data.message,
              user_name: (data.profiles as any)?.full_name || 'Anonymous',
              created_at: data.created_at
            }
            console.log('✅ Adding comment to UI:', newComment)
            setComments(prev => [...prev, newComment])
            
            // Scroll to bottom
            setTimeout(() => {
              commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Comments subscription status:', status)
      })

    return () => {
      console.log('🔕 Unsubscribing from comments')
      commentsChannel.unsubscribe()
    }
  }, [selectedStream])

  // Fallback: Poll for new comments every 3 seconds
  useEffect(() => {
    if (!selectedStream || !isConnected) return

    const pollComments = setInterval(async () => {
      if (comments.length > 0) {
        const lastCommentTime = comments[comments.length - 1]?.created_at
        const { data } = await supabase
          .from('stream_comments')
          .select(`
            id,
            message,
            created_at,
            profiles:user_id (full_name)
          `)
          .eq('stream_id', selectedStream.id)
          .gt('created_at', lastCommentTime)
          .order('created_at', { ascending: true })

        if (data && data.length > 0) {
          console.log('🔄 Polling found', data.length, 'new comments')
          const newComments = data.map((comment: any) => ({
            id: comment.id,
            message: comment.message,
            user_name: comment.profiles?.full_name || 'Anonymous',
            created_at: comment.created_at
          }))
          setComments(prev => [...prev, ...newComments])
          setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollComments)
  }, [selectedStream, isConnected, comments])

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
        
        // Trigger floating reaction animation
        triggerReaction('like')
        
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
        
        // Trigger floating reaction animation
        triggerReaction('dislike')
        
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
    setShowZakatModal(true)
  }

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const togglePictureInPicture = async () => {
    if (!remoteVideoRef.current) return

    try {
      const videoElement = remoteVideoRef.current.querySelector('video')
      if (!videoElement) {
        console.warn('No video element found for PiP')
        return
      }

      if (!document.pictureInPictureElement) {
        await videoElement.requestPictureInPicture()
        setIsPiP(true)
      } else {
        await document.exitPictureInPicture()
        setIsPiP(false)
      }
    } catch (err) {
      console.error('Picture-in-Picture error:', err)
    }
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
              <div 
                ref={videoContainerRef}
                className={`relative aspect-video bg-black rounded-lg overflow-hidden group ${isPiP ? 'ring-4 ring-blue-500' : ''}`}
              >
                <div ref={remoteVideoRef} className="w-full h-full" />
                
                {/* Video controls overlay (show on hover) */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="bg-black/50 hover:bg-black/70 text-white"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={togglePictureInPicture}
                    className="bg-black/50 hover:bg-black/70 text-white"
                    title="Picture-in-Picture"
                  >
                    <PictureInPicture2 className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Floating reactions overlay */}
                <FloatingReactions />
                
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
                {/* Reactions and Zakat */}
                <div className="flex items-center justify-center gap-2">
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
                    size="sm"
                    onClick={handleZakat}
                    className="border-green-500 text-green-600 hover:bg-green-50 px-3"
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    <span className="text-xs">Zakat</span>
                  </Button>
                </div>

                {/* Comments Section */}
                <div className="border rounded-lg p-3 space-y-2">
                  <h3 className="text-sm font-semibold mb-2">Live Chat</h3>
                  
                  {/* Comments Display */}
                  <div className="h-32 overflow-y-auto space-y-2 mb-2 bg-gray-50 rounded p-2">
                    {comments.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No messages yet. Be the first to comment!</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="text-xs">
                          <span className="font-semibold text-emerald-600">{comment.user_name}: </span>
                          <span className="text-gray-700">{comment.message}</span>
                        </div>
                      ))
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* Comment Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !sendingComment && sendComment()}
                      placeholder="Type a message..."
                      className="flex-1 text-sm px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      maxLength={200}
                      disabled={sendingComment}
                    />
                    <Button
                      size="sm"
                      onClick={sendComment}
                      disabled={!newComment.trim() || sendingComment}
                      className="px-4"
                    >
                      {sendingComment ? '...' : 'Send'}
                    </Button>
                  </div>
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
      
      {/* Zakat Modal */}
      {selectedStream && (
        <ZakatModal
          isOpen={showZakatModal}
          onClose={() => setShowZakatModal(false)}
          scholarId={selectedStream.scholarId}
          streamTitle={selectedStream.title}
        />
      )}
    </div>
  )
}
