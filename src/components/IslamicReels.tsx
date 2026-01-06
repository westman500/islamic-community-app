import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'
import { Heart, ThumbsDown, MessageCircle, Share2, Flag, Upload, Film, Eye, AlertTriangle, X, Bookmark, Trash2 } from 'lucide-react'
import { useNotification } from '../contexts/NotificationContext'
import { notifyReelUploaded, notifyCoinReward } from '../utils/pushNotifications'

interface Reel {
  id: string
  user_id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  category: string | null
  views_count: number
  likes_count: number
  dislikes_count: number
  comments_count: number
  favorites_count: number
  shares_count: number
  is_approved: boolean
  moderation_status: string
  created_at: string
  profiles: {
    full_name: string
    avatar_url: string | null
  }
  liked_by_user?: boolean
  disliked_by_user?: boolean
  favorited_by_user?: boolean
}

export const IslamicReels: React.FC = () => {
  const { profile } = useAuth()
  const { showNotification } = useNotification()
  const [reels, setReels] = useState<Reel[]>([])
  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [viewTracked, setViewTracked] = useState(false)

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'islamic_reminder',
    videoFile: null as File | null
  })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')

  // Flag form state
  const [flagReason, setFlagReason] = useState('explicit_content')
  const [flagDescription, setFlagDescription] = useState('')

  useEffect(() => {
    fetchReels()
  }, [])

  useEffect(() => {
    // Auto-play current reel
    if (videoRef.current && reels.length > 0) {
      videoRef.current.play().catch(console.error)
      // Reset view tracking when reel changes
      setViewTracked(false)
      
      // Preload next reel for seamless playback
      const nextIndex = (currentReelIndex + 1) % reels.length
      if (reels[nextIndex]) {
        const nextVideo = document.createElement('video')
        nextVideo.src = reels[nextIndex].video_url
        nextVideo.preload = 'auto'
        nextVideo.load() // Start loading next video
      }
    }
  }, [currentReelIndex, reels])

  // Define current reel before useEffect
  const currentReel = reels[currentReelIndex]

  // Track view after watching for 3 seconds
  useEffect(() => {
    if (!currentReel || viewTracked || !profile?.id) return

    const timer = setTimeout(async () => {
      await trackReelView(currentReel.id)
      setViewTracked(true)
    }, 3000) // Track after 3 seconds

    return () => clearTimeout(timer)
  }, [currentReel, viewTracked, profile])

  const fetchReels = async () => {
    try {
      setLoading(true)
      
      // Only fetch reels created within last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('islamic_reels')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('is_approved', true)
        .eq('is_active', true)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Check which reels user has liked, disliked, and favorited
      if (profile?.id && data) {
        const reelIds = data.map(r => r.id)
        
        const [likesResult, dislikesResult, favoritesResult] = await Promise.all([
          supabase.from('reel_likes').select('reel_id').eq('user_id', profile.id).in('reel_id', reelIds),
          supabase.from('reel_dislikes').select('reel_id').eq('user_id', profile.id).in('reel_id', reelIds),
          supabase.from('reel_favorites').select('reel_id').eq('user_id', profile.id).in('reel_id', reelIds)
        ])

        const likedReelIds = new Set(likesResult.data?.map(l => l.reel_id) || [])
        const dislikedReelIds = new Set(dislikesResult.data?.map(d => d.reel_id) || [])
        const favoritedReelIds = new Set(favoritesResult.data?.map(f => f.reel_id) || [])
        
        const reelsWithStatus = data.map(reel => ({
          ...reel,
          liked_by_user: likedReelIds.has(reel.id),
          disliked_by_user: dislikedReelIds.has(reel.id),
          favorited_by_user: favoritedReelIds.has(reel.id)
        }))
        
        setReels(reelsWithStatus)
      } else {
        setReels(data || [])
      }
    } catch (error) {
      console.error('Error fetching reels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReel = async (reelId: string, videoUrl: string) => {
    if (!profile?.id) return

    const confirmDelete = window.confirm('Are you sure you want to delete this reel? This action cannot be undone.')
    if (!confirmDelete) return

    try {
      // Extract file path from URL
      const urlParts = videoUrl.split('/videos/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        
        // Delete video file from storage
        const { error: storageError } = await supabase.storage
          .from('videos')
          .remove([filePath])

        if (storageError) {
          console.error('Error deleting video file:', storageError)
        }
      }

      // Delete reel record from database
      const { error: dbError } = await supabase
        .from('islamic_reels')
        .delete()
        .eq('id', reelId)
        .eq('user_id', profile.id) // Security: only delete own reels

      if (dbError) throw dbError

      showNotification('Reel deleted successfully', 'success')
      
      // Refresh reels list
      await fetchReels()
    } catch (error: any) {
      console.error('Error deleting reel:', error)
      showNotification('Failed to delete reel: ' + error.message, 'error')
    }
  }

  const trackReelView = async (reelId: string) => {
    try {
      if (!profile?.id) return

      // Insert view record (database will handle duplicates and trigger coin rewards)
      const { error } = await supabase
        .from('reel_views')
        .insert({
          reel_id: reelId,
          user_id: profile.id,
          watched_duration_seconds: 0,
          completed: false
        })

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error tracking view:', error)
      } else {
        console.log('✅ View tracked for reel:', reelId)
        
        // Check if user earned coins (will be shown via database trigger notification)
        const { data: rewards } = await supabase
          .from('reel_rewards')
          .select('*')
          .eq('reel_id', reelId)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (rewards && rewards.length > 0) {
          const latestReward = rewards[0]
          // Show notification for coin reward
          await notifyCoinReward(
            latestReward.coins_awarded,
            `Your reel reached ${latestReward.milestone_views} views!`
          )
          showNotification(
            `🎁 You earned ${latestReward.coins_awarded} coins! Your reel reached ${latestReward.milestone_views} views!`,
            'success'
          )
        }
      }
    } catch (error) {
      console.error('Error in trackReelView:', error)
    }
  }

  const handleNextReel = () => {
    if (currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(prev => prev + 1)
      incrementViews(reels[currentReelIndex + 1].id)
    }
  }

  const handlePrevReel = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1)
    }
  }

  const incrementViews = async (reelId: string) => {
    try {
      await supabase.rpc('increment_reel_views', { reel_id: reelId })
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  const handleLike = async (reelId: string) => {
    if (!profile?.id) return

    try {
      const reel = reels.find(r => r.id === reelId)
      if (!reel) return

      if (reel.liked_by_user) {
        // Unlike
        await supabase
          .from('reel_likes')
          .delete()
          .eq('reel_id', reelId)
          .eq('user_id', profile.id)

        // Update likes_count in islamic_reels table
        await supabase
          .from('islamic_reels')
          .update({ likes_count: Math.max(0, reel.likes_count - 1) })
          .eq('id', reelId)

        setReels(prev => prev.map(r =>
          r.id === reelId
            ? { ...r, likes_count: Math.max(0, r.likes_count - 1), liked_by_user: false }
            : r
        ))
      } else {
        // Like (and remove dislike if exists)
        if (reel.disliked_by_user) {
          await supabase
            .from('reel_dislikes')
            .delete()
            .eq('reel_id', reelId)
            .eq('user_id', profile.id)
          
          // Decrease dislikes_count
          await supabase
            .from('islamic_reels')
            .update({ dislikes_count: Math.max(0, reel.dislikes_count - 1) })
            .eq('id', reelId)
        }

        await supabase
          .from('reel_likes')
          .insert({ reel_id: reelId, user_id: profile.id })

        // Increase likes_count
        await supabase
          .from('islamic_reels')
          .update({ likes_count: reel.likes_count + 1 })
          .eq('id', reelId)

        setReels(prev => prev.map(r =>
          r.id === reelId
            ? { 
                ...r, 
                likes_count: r.likes_count + 1, 
                dislikes_count: r.disliked_by_user ? Math.max(0, r.dislikes_count - 1) : r.dislikes_count,
                liked_by_user: true,
                disliked_by_user: false
              }
            : r
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleDislike = async (reelId: string) => {
    if (!profile?.id) return

    try {
      const reel = reels.find(r => r.id === reelId)
      if (!reel) return

      if (reel.disliked_by_user) {
        // Remove dislike
        await supabase
          .from('reel_dislikes')
          .delete()
          .eq('reel_id', reelId)
          .eq('user_id', profile.id)

        // Update dislikes_count in islamic_reels table
        await supabase
          .from('islamic_reels')
          .update({ dislikes_count: Math.max(0, reel.dislikes_count - 1) })
          .eq('id', reelId)

        setReels(prev => prev.map(r =>
          r.id === reelId
            ? { ...r, dislikes_count: Math.max(0, r.dislikes_count - 1), disliked_by_user: false }
            : r
        ))
      } else {
        // Dislike (and remove like if exists)
        if (reel.liked_by_user) {
          await supabase
            .from('reel_likes')
            .delete()
            .eq('reel_id', reelId)
            .eq('user_id', profile.id)
          
          // Decrease likes_count
          await supabase
            .from('islamic_reels')
            .update({ likes_count: Math.max(0, reel.likes_count - 1) })
            .eq('id', reelId)
        }

        await supabase
          .from('reel_dislikes')
          .insert({ reel_id: reelId, user_id: profile.id })

        // Increase dislikes_count
        await supabase
          .from('islamic_reels')
          .update({ dislikes_count: reel.dislikes_count + 1 })
          .eq('id', reelId)

        setReels(prev => prev.map(r =>
          r.id === reelId
            ? { 
                ...r, 
                dislikes_count: r.dislikes_count + 1,
                likes_count: r.liked_by_user ? Math.max(0, r.likes_count - 1) : r.likes_count,
                disliked_by_user: true,
                liked_by_user: false
              }
            : r
        ))
      }
    } catch (error) {
      console.error('Error toggling dislike:', error)
    }
  }

  const handleFavorite = async (reelId: string) => {
    if (!profile?.id) return

    try {
      const reel = reels.find(r => r.id === reelId)
      if (!reel) return

      if (reel.favorited_by_user) {
        // Unfavorite
        await supabase
          .from('reel_favorites')
          .delete()
          .eq('reel_id', reelId)
          .eq('user_id', profile.id)

        setReels(prev => prev.map(r =>
          r.id === reelId
            ? { ...r, favorites_count: r.favorites_count - 1, favorited_by_user: false }
            : r
        ))
      } else {
        // Favorite
        await supabase
          .from('reel_favorites')
          .insert({ reel_id: reelId, user_id: profile.id })

        setReels(prev => prev.map(r =>
          r.id === reelId
            ? { ...r, favorites_count: r.favorites_count + 1, favorited_by_user: true }
            : r
        ))
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleShare = async (reel: Reel) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title,
          text: reel.description || '',
          url: window.location.href
        })
        
        // Increment share count
        await supabase
          .from('islamic_reels')
          .update({ shares_count: reel.shares_count + 1 })
          .eq('id', reel.id)
      } catch (error) {
        console.error('Error sharing:', error)
      }
    }
  }

  const handleFlag = async () => {
    if (!profile?.id || !selectedReel) return

    try {
      const { error } = await supabase
        .from('reel_flags')
        .insert({
          reel_id: selectedReel.id,
          reporter_id: profile.id,
          reason: flagReason,
          description: flagDescription
        })

      if (error) throw error

      alert('Thank you for reporting. Our moderation team will review this content.')
      setShowFlagModal(false)
      setFlagDescription('')
    } catch (error: any) {
      console.error('Error flagging reel:', error)
      if (error.code === '23505') {
        alert('You have already flagged this content.')
      }
    }
  }

  const handleUpload = async () => {
    if (!profile?.id || !uploadForm.videoFile) {
      setUploadError('Please select a video file')
      return
    }

    if (!uploadForm.title.trim()) {
      setUploadError('Please enter a title')
      return
    }

    try {
      setUploadProgress(5)
      console.log('📤 Starting video upload...', {
        fileName: uploadForm.videoFile.name,
        fileSize: `${(uploadForm.videoFile.size / 1024 / 1024).toFixed(2)} MB`,
        fileType: uploadForm.videoFile.type
      })
      
      // Upload video to Supabase Storage
      const fileExt = uploadForm.videoFile.name.split('.').pop()?.toLowerCase()
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`
      const filePath = `reels/${fileName}`

      // Map file extensions to MIME types
      const mimeTypeMap: Record<string, string> = {
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'webm': 'video/webm',
        'mpeg': 'video/mpeg',
        'mpg': 'video/mpeg',
        'm4v': 'video/mp4'
      }

      const contentType = mimeTypeMap[fileExt || ''] || uploadForm.videoFile.type || 'video/mp4'
      console.log(`📦 Uploading to: ${filePath} with MIME type: ${contentType}`)

      setUploadProgress(10)
      
      // Simulate progress during upload (since Supabase doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 50) return prev + 5
          return prev
        })
      }, 500)

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, uploadForm.videoFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType
        })

      clearInterval(progressInterval)

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError)
        throw uploadError
      }

      console.log('✅ Video uploaded successfully')
      setUploadProgress(70)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      setUploadProgress(80)

      // Insert reel record (auto-approved for now)
      const { error: insertError } = await supabase
        .from('islamic_reels')
        .insert({
          user_id: profile.id,
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category,
          video_url: publicUrl,
          is_approved: true,
          moderation_status: 'approved'
        })

      if (insertError) throw insertError

      setUploadProgress(100)
      
      // Show success notification
      showNotification(
        '🎥 Reel uploaded successfully! It is now visible to all users.',
        'success'
      )
      
      // Send push notification
      await notifyReelUploaded(
        profile.full_name || 'A user',
        uploadForm.title
      )
      
      setShowUploadModal(false)
      setUploadForm({ title: '', description: '', category: 'islamic_reminder', videoFile: null })
      setUploadProgress(0)
      setUploadError('')
    } catch (error: any) {
      console.error('Error uploading reel:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      setUploadError(`Failed to upload: ${error.message || 'Please try again.'}`)
      setUploadProgress(0)
    }
  }

  if (loading) {
    return (
      <MobileLayout title="Islamic Reels">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Film className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p>Loading reels...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Islamic Reels">
      <div className="p-4 space-y-4 max-w-md md:max-w-lg mx-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Upload Button - Sticky for easy access */}
        <div className="sticky top-0 z-10 bg-gray-50 pb-2">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
            size="lg"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Reel
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['All', 'Quran', 'Dua', 'Reminder', 'Food', 'Travel', 'Education'].map(cat => (
            <Button key={cat} variant="outline" size="sm" className="whitespace-nowrap">
              {cat}
            </Button>
          ))}
        </div>

        {/* Current Reel */}
        {currentReel && (
          <Card className="overflow-hidden">
            <div className="relative bg-black aspect-[9/16]">
              {/* Video Player */}
              <video
                ref={videoRef}
                src={currentReel.video_url}
                poster={currentReel.thumbnail_url || undefined}
                loop
                playsInline
                preload="auto"
                muted={false}
                autoPlay
                className="w-full h-full object-contain"
                onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()}
                onLoadStart={() => console.log('Video loading started')}
                onCanPlay={() => console.log('Video can play')}
                onError={(e) => console.error('Video error:', e)}
              />

              {/* Overlay Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                <div className="flex items-start gap-3">
                  <img
                    src={currentReel.profiles?.avatar_url || 'https://via.placeholder.com/40'}
                    alt={currentReel.profiles?.full_name}
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{currentReel.title}</h3>
                    <p className="text-sm opacity-90">{currentReel.profiles?.full_name}</p>
                    {currentReel.description && (
                      <p className="text-sm mt-2 opacity-75">{currentReel.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons (Right Side) */}
              <div className="absolute right-2 bottom-20 flex flex-col gap-3">
                <button
                  onClick={() => handleLike(currentReel.id)}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className={`w-10 h-10 rounded-full ${currentReel.liked_by_user ? 'bg-red-500' : 'bg-white/20'} flex items-center justify-center backdrop-blur-sm`}>
                    <Heart className={`h-5 w-5 ${currentReel.liked_by_user ? 'fill-white' : ''} text-white`} />
                  </div>
                  <span className="text-white text-[10px] font-medium">{currentReel.likes_count}</span>
                </button>

                <button
                  onClick={() => handleDislike(currentReel.id)}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className={`w-10 h-10 rounded-full ${currentReel.disliked_by_user ? 'bg-gray-700' : 'bg-white/20'} flex items-center justify-center backdrop-blur-sm`}>
                    <ThumbsDown className={`h-5 w-5 ${currentReel.disliked_by_user ? 'fill-white' : ''} text-white`} />
                  </div>
                  <span className="text-white text-[10px] font-medium">{currentReel.dislikes_count}</span>
                </button>

                <button className="flex flex-col items-center gap-0.5">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-white text-[10px] font-medium">{currentReel.comments_count}</span>
                </button>

                <button
                  onClick={() => handleFavorite(currentReel.id)}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className={`w-10 h-10 rounded-full ${currentReel.favorited_by_user ? 'bg-yellow-500' : 'bg-white/20'} flex items-center justify-center backdrop-blur-sm`}>
                    <Bookmark className={`h-5 w-5 ${currentReel.favorited_by_user ? 'fill-white' : ''} text-white`} />
                  </div>
                  <span className="text-white text-[10px] font-medium">{currentReel.favorites_count}</span>
                </button>

                <button
                  onClick={() => handleShare(currentReel)}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Share2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-white text-[10px] font-medium">{currentReel.shares_count}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedReel(currentReel)
                    setShowFlagModal(true)
                  }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Flag className="h-4 w-4 text-white" />
                  </div>
                </button>

                {/* Delete button - only show for own reels */}
                {profile?.id === currentReel.user_id && (
                  <button
                    onClick={() => handleDeleteReel(currentReel.id, currentReel.video_url)}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center backdrop-blur-sm">
                      <Trash2 className="h-4 w-4 text-white" />
                    </div>
                  </button>
                )}

                <div className="flex flex-col items-center gap-0.5 mt-1">
                  <Eye className="h-3.5 w-3.5 text-white" />
                  <span className="text-white text-[10px]">{currentReel.views_count}</span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-4 bg-gray-50">
              <Button
                onClick={handlePrevReel}
                disabled={currentReelIndex === 0}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                {currentReelIndex + 1} / {reels.length}
              </span>
              <Button
                onClick={handleNextReel}
                disabled={currentReelIndex === reels.length - 1}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </Card>
        )}

        {reels.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Film className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="font-bold text-lg mb-2">No Reels Yet</h3>
              <p className="text-gray-600 mb-4">Be the first to upload an Islamic reel!</p>
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Reel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Reel
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUploadModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Content Moderation Policy</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>No explicit or inappropriate content</li>
                      <li>Must be Islamic-themed or educational</li>
                      <li>Respectful language only</li>
                      <li>All reels reviewed before approval</li>
                    </ul>
                  </div>
                </div>

                {uploadError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                    {uploadError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Video File *</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setUploadForm(prev => ({ ...prev, videoFile: e.target.files?.[0] || null }))}
                    className="w-full border rounded-lg p-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 100MB, MP4 recommended</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Title *</label>
                  <Input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Beautiful Quran Recitation"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    className="w-full p-2 border rounded-md"
                    value={uploadForm.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell viewers about your reel..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category *</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="quran_recitation">Quran Recitation</option>
                    <option value="dua">Dua</option>
                    <option value="islamic_reminder">Islamic Reminder</option>
                    <option value="halal_food">Halal Food</option>
                    <option value="travel">Travel</option>
                    <option value="education">Education</option>
                    <option value="lifestyle">Lifestyle</option>
                  </select>
                </div>

                {uploadProgress > 0 && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-center mt-1">{uploadProgress}%</p>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={uploadProgress > 0}
                  className="w-full"
                >
                  {uploadProgress > 0 ? 'Uploading...' : 'Upload Reel'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Flag Modal */}
        {showFlagModal && selectedReel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-red-600" />
                    Report Content
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFlagModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Why are you reporting this reel?
                </p>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason *</label>
                  <select
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="w-full border rounded-lg p-2"
                  >
                    <option value="explicit_content">Explicit/Inappropriate Content</option>
                    <option value="harassment">Harassment or Hate Speech</option>
                    <option value="spam">Spam</option>
                    <option value="misinformation">Misinformation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Additional Details</label>
                  <textarea
                    className="w-full p-2 border rounded-md"
                    value={flagDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFlagDescription(e.target.value)}
                    placeholder="Please provide more information..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowFlagModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleFlag}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Submit Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
