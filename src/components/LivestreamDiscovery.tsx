import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { ThumbsUp, ThumbsDown, Users, DollarSign, Video, AlertCircle, Ban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'

interface Stream {
  id: string
  scholar_id: string
  title: string
  channel: string
  is_active: boolean
  price: number
  is_free: boolean
  viewer_count: number
  likes_count: number
  dislikes_count: number
  started_at: string
  ended_at?: string | null
  scholar: {
    full_name: string
    role: string
  }
  user_reaction?: 'like' | 'dislike' | null
  has_access?: boolean
}

export const LivestreamDiscovery: React.FC = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [streams, setStreams] = useState<Stream[]>([])
  const [endedStreams, setEndedStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchActiveStreams()
    
    // Poll for updates every 5 seconds (faster refresh)
    const interval = setInterval(fetchActiveStreams, 5000)
    
    // Subscribe to realtime changes on streams table
    const streamSubscription = supabase
      .channel('streams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streams',
        },
        (payload) => {
          console.log('Stream change detected:', payload)
          // Immediately refetch when any stream changes
          fetchActiveStreams()
          fetchEndedStreams()
        }
      )
      .subscribe()
    
    return () => {
      clearInterval(interval)
      streamSubscription.unsubscribe()
    }
  }, [profile?.id])

  const fetchActiveStreams = async () => {
    try {
      setError('') // Clear previous errors
      
      // Only show streams from the last 24 hours to avoid old stale streams
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      // Fetch active streams with scholar info
      const { data: streamsData, error: streamsError } = await supabase
        .from('streams')
        .select(`
          *,
          scholar:profiles!scholar_id(full_name, role, certificate_verified)
        `)
        .eq('is_active', true)
        .gte('started_at', twentyFourHoursAgo)
        .order('started_at', { ascending: false })

      if (streamsError) {
        console.error('Streams error:', streamsError)
        throw new Error('Unable to load streams. Please check your internet connection.')
      }

      console.log(`Found ${streamsData?.length || 0} active streams`)
      
      if (!streamsData || streamsData.length === 0) {
        setStreams([])
        setLoading(false)
        return
      }

      // Fetch user's reactions for these streams (optional - don't fail if this errors)
      const streamIds = streamsData.map(s => s.id)
      
      let reactionsData = null
      let accessData = null
      
      if (profile?.id && streamIds.length > 0) {
        try {
          const { data: reactions } = await supabase
            .from('stream_reactions')
            .select('stream_id, reaction_type')
            .eq('user_id', profile.id)
            .in('stream_id', streamIds)
          reactionsData = reactions

          // Fetch user's access to paid streams
          const { data: access } = await supabase
            .from('stream_access')
            .select('stream_id, payment_status')
            .eq('user_id', profile.id)
            .in('stream_id', streamIds)
            .eq('payment_status', 'success')
          accessData = access
        } catch (optionalError) {
          console.warn('Optional data fetch failed:', optionalError)
        }
      }

      // Combine data
      const enrichedStreams = streamsData.map(stream => ({
        ...stream,
        user_reaction: reactionsData?.find(r => r.stream_id === stream.id)?.reaction_type || null,
        has_access: stream.is_free || accessData?.some(a => a.stream_id === stream.id) || false
      }))

      setStreams(enrichedStreams as Stream[])
      console.log('Active streams loaded:', enrichedStreams.map(s => ({ id: s.id, title: s.title, is_active: s.is_active })))
      setLoading(false)
      
      // Fetch recently ended streams (last 24 hours)
      fetchEndedStreams()
    } catch (err: any) {
      console.error('Error fetching streams:', err)
      setError(err.message || 'Failed to load streams. Please try again.')
      setStreams([]) // Clear streams on error
      setLoading(false)
    }
  }

  const fetchEndedStreams = async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data: endedData, error: endedError } = await supabase
        .from('streams')
        .select(`
          *,
          scholar:profiles!scholar_id(full_name, role)
        `)
        .eq('is_active', false)
        .not('ended_at', 'is', null)
        .gte('ended_at', twentyFourHoursAgo)
        .order('ended_at', { ascending: false })
        .limit(5)

      if (endedError) {
        console.error('Error fetching ended streams:', endedError)
        return
      }

      console.log(`Found ${endedData?.length || 0} ended streams`)
      setEndedStreams((endedData || []) as Stream[])
    } catch (err) {
      console.error('Error fetching ended streams:', err)
    }
  }

  const formatDuration = (startedAt: string, endedAt: string | null | undefined) => {
    if (!endedAt) return 'Unknown duration'
    const start = new Date(startedAt)
    const end = new Date(endedAt)
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / 60000)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const handleReaction = async (streamId: string, reactionType: 'like' | 'dislike') => {
    try {
      const currentStream = streams.find(s => s.id === streamId)
      
      // If user already reacted with the same type, remove reaction
      if (currentStream?.user_reaction === reactionType) {
        await supabase
          .from('stream_reactions')
          .delete()
          .eq('stream_id', streamId)
          .eq('user_id', profile?.id || '')
      } else {
        // Upsert reaction (insert or update)
        await supabase
          .from('stream_reactions')
          .upsert({
            stream_id: streamId,
            user_id: profile?.id || '',
            reaction_type: reactionType
          }, {
            onConflict: 'stream_id,user_id'
          })
      }

      // Refresh streams to update counts
      await fetchActiveStreams()
    } catch (err: any) {
      console.error('Error updating reaction:', err)
    }
  }

  const handleJoinStream = async (stream: Stream) => {
    try {
      console.log('Attempting to join stream:', stream)
      console.log('Channel name:', stream.channel)
      
      // Validate channel name exists
      if (!stream.channel) {
        console.error('❌ Stream has no channel!', stream)
        alert('Unable to join stream - invalid channel information. Please try again.')
        return
      }
      
      // Check if stream is paid and user doesn't have access
      if (!stream.is_free && !stream.has_access) {
        // Navigate to payment page
        navigate(`/stream/${stream.id}/payment`)
        return
      }

      // Check if user is restricted from this stream
      const { data: restrictions } = await supabase
        .from('stream_restrictions')
        .select('*')
        .eq('stream_id', stream.id)
        .eq('user_id', profile?.id || '')
        .single()

      if (restrictions) {
        if (restrictions.restriction_type === 'ban') {
          alert('You have been banned from this stream.')
          return
        }
      }

      // Navigate to stream viewer
      console.log('✅ Navigating to:', `/watch-stream/${stream.channel}`)
      navigate(`/watch-stream/${stream.channel}`)
    } catch (err: any) {
      console.error('Error joining stream:', err)
    }
  }

  const handleReportStream = async (streamId: string) => {
    const reason = prompt('Please describe the reason for reporting this stream:')
    
    if (!reason) return

    try {
      await supabase.from('reports').insert({
        reporter_id: profile?.id,
        reported_stream_id: streamId,
        report_type: 'inappropriate_content',
        description: reason
      })

      alert('Stream reported. Our team will review it shortly.')
    } catch (err: any) {
      console.error('Error reporting stream:', err)
      alert('Failed to report stream. Please try again.')
    }
  }

  const handleBlockScholar = async (scholarId: string) => {
    const confirmed = confirm('Are you sure you want to block this scholar? You will not see their streams anymore.')
    
    if (!confirmed) return

    try {
      await supabase.from('blocked_users').insert({
        blocker_id: profile?.id,
        blocked_id: scholarId,
        reason: 'Blocked from stream discovery'
      })

      alert('Scholar blocked successfully.')
      await fetchActiveStreams()
    } catch (err: any) {
      console.error('Error blocking scholar:', err)
      alert('Failed to block scholar. Please try again.')
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <p>Loading active streams...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <MobileLayout title="Live Streams">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="p-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Live Streams">
      <div className="space-y-6">
        {/* Active Streams Section */}
        {streams.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold mb-4">Live Now</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {streams.map((stream) => (
          <Card key={stream.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{stream.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    by {stream.scholar.full_name}
                  </p>
                  <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full mt-2">
                    <Video className="inline w-3 h-3 mr-1" />
                    LIVE
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {/* Stream Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {stream.viewer_count}
                    </span>
                    
                    <button
                      onClick={() => handleReaction(stream.id, 'like')}
                      className={`flex items-center gap-1 ${
                        stream.user_reaction === 'like' ? 'text-blue-600' : 'text-gray-600'
                      } hover:text-blue-600`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      {stream.likes_count}
                    </button>
                    
                    <button
                      onClick={() => handleReaction(stream.id, 'dislike')}
                      className={`flex items-center gap-1 ${
                        stream.user_reaction === 'dislike' ? 'text-red-600' : 'text-gray-600'
                      } hover:text-red-600`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      {stream.dislikes_count}
                    </button>
                  </div>
                </div>

                {/* Price */}
                {!stream.is_free && (
                  <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <DollarSign className="w-4 h-4" />
                    ${stream.price.toFixed(2)}
                    {stream.has_access && <span className="ml-2 text-xs text-gray-500">(Already paid)</span>}
                  </div>
                )}
                
                {stream.is_free && (
                  <div className="text-sm font-semibold text-green-600">
                    FREE
                  </div>
                )}

                {/* Duration */}
                <div className="text-xs text-gray-500">
                  Started {new Date(stream.started_at).toLocaleTimeString()}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button
                onClick={() => handleJoinStream(stream)}
                className="w-full"
                variant={!stream.is_free && !stream.has_access ? 'default' : 'default'}
              >
                {!stream.is_free && !stream.has_access ? `Pay & Join ($${stream.price})` : 'Join Stream'}
              </Button>
              
              <div className="flex gap-2 w-full">
                <Button
                  onClick={() => handleReportStream(stream.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Report
                </Button>
                
                <Button
                  onClick={() => handleBlockScholar(stream.scholar_id)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Block
                </Button>
              </div>
            </CardFooter>
          </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="w-full">
            <CardContent className="p-6">
              <p className="text-gray-500 text-center">No active streams at the moment. Check back later!</p>
            </CardContent>
          </Card>
        )}

        {/* Recently Ended Streams Section */}
        {endedStreams.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-600">Recently Ended</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {endedStreams.map((stream) => (
                <Card key={stream.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-gray-700">{stream.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          by {stream.scholar.full_name}
                        </p>
                        <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full mt-2">
                          ENDED
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        <strong>Duration:</strong> {formatDuration(stream.started_at, stream.ended_at)}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Peak viewers:</strong> {stream.viewer_count}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {stream.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsDown className="w-4 h-4" />
                          {stream.dislikes_count}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Ended {new Date(stream.ended_at || '').toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
