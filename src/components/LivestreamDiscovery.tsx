import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { ThumbsUp, ThumbsDown, Users, DollarSign, Video, AlertCircle, Ban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Stream {
  id: string
  scholar_id: string
  title: string
  channel_name: string
  is_active: boolean
  price: number
  is_free: boolean
  viewer_count: number
  likes_count: number
  dislikes_count: number
  started_at: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchActiveStreams()
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchActiveStreams, 10000)
    
    return () => clearInterval(interval)
  }, [profile?.id])

  const fetchActiveStreams = async () => {
    try {
      // Fetch active streams with scholar info
      const { data: streamsData, error: streamsError } = await supabase
        .from('streams')
        .select(`
          *,
          scholar:profiles!scholar_id(full_name, role)
        `)
        .eq('is_active', true)
        .order('started_at', { ascending: false })

      if (streamsError) throw streamsError

      if (!streamsData) {
        setStreams([])
        return
      }

      // Fetch user's reactions for these streams
      const streamIds = streamsData.map(s => s.id)
      
      const { data: reactionsData } = await supabase
        .from('stream_reactions')
        .select('stream_id, reaction_type')
        .eq('user_id', profile?.id || '')
        .in('stream_id', streamIds)

      // Fetch user's access to paid streams
      const { data: accessData } = await supabase
        .from('stream_access')
        .select('stream_id, payment_status')
        .eq('user_id', profile?.id || '')
        .in('stream_id', streamIds)
        .eq('payment_status', 'completed')

      // Combine data
      const enrichedStreams = streamsData.map(stream => ({
        ...stream,
        user_reaction: reactionsData?.find(r => r.stream_id === stream.id)?.reaction_type || null,
        has_access: stream.is_free || accessData?.some(a => a.stream_id === stream.id) || false
      }))

      setStreams(enrichedStreams as Stream[])
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching streams:', err)
      setError(err.message)
      setLoading(false)
    }
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
      navigate(`/watch-stream/${stream.channel_name}`)
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
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (streams.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <p className="text-gray-500">No active streams at the moment. Check back later!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Live Streams</h1>
      
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
  )
}
