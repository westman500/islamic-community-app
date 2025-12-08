import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'
import { Play, Heart, MessageCircle, Share2, Flag, Upload, Film, Eye, AlertTriangle, X } from 'lucide-react'

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
  shares_count: number
  is_approved: boolean
  moderation_status: string
  created_at: string
  profiles: {
    full_name: string
    avatar_url: string | null
  }
  liked_by_user?: boolean
}

export const IslamicReels: React.FC = () => {
  const { profile } = useAuth()
  const [reels, setReels] = useState<Reel[]>([])
  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

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
    }
  }, [currentReelIndex, reels])

  const fetchReels = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('islamic_reels')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('is_approved', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Check which reels user has liked
      if (profile?.id && data) {
        const { data: likes } = await supabase
          .from('reel_likes')
          .select('reel_id')
          .eq('user_id', profile.id)
          .in('reel_id', data.map(r => r.id))

        const likedReelIds = new Set(likes?.map(l => l.reel_id) || [])
        
        const reelsWithLikeStatus = data.map(reel => ({
          ...reel,
          liked_by_user: likedReelIds.has(reel.id)
        }))
        
        setReels(reelsWithLikeStatus)
      } else {
        setReels(data || [])
      }
    } catch (error) {
      console.error('Error fetching reels:', error)
    } finally {
      setLoading(false)
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

        setReels(prev => prev.map(r =>
          r.id === reelId
            ? { ...r, likes_count: r.likes_count - 1, liked_by_user: false }
            : r
        ))
      } else {
        // Like
        await supabase
          .from('reel_likes')
          .insert({ reel_id: reelId, user_id: profile.id })

        setReels(prev => prev.map(r =>
          r.id === reelId
            ? { ...r, likes_count: r.likes_count + 1, liked_by_user: true }
            : r
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
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
      setUploadProgress(10)
      
      // Upload video to Supabase Storage
      const fileExt = uploadForm.videoFile.name.split('.').pop()
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`
      const filePath = `reels/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, uploadForm.videoFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      setUploadProgress(60)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      setUploadProgress(80)

      // Insert reel record (pending approval)
      const { error: insertError } = await supabase
        .from('islamic_reels')
        .insert({
          user_id: profile.id,
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category,
          video_url: publicUrl,
          is_approved: false,
          moderation_status: 'pending'
        })

      if (insertError) throw insertError

      setUploadProgress(100)
      alert('Reel uploaded successfully! It will be visible after moderation approval.')
      setShowUploadModal(false)
      setUploadForm({ title: '', description: '', category: 'islamic_reminder', videoFile: null })
      setUploadProgress(0)
    } catch (error) {
      console.error('Error uploading reel:', error)
      setUploadError('Failed to upload. Please try again.')
      setUploadProgress(0)
    }
  }

  const currentReel = reels[currentReelIndex]

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
      <div className="p-4 space-y-4">
        {/* Upload Button */}
        <Button
          onClick={() => setShowUploadModal(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Reel
        </Button>

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
                className="w-full h-full object-contain"
                onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()}
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
              <div className="absolute right-4 bottom-24 flex flex-col gap-4">
                <button
                  onClick={() => handleLike(currentReel.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-12 h-12 rounded-full ${currentReel.liked_by_user ? 'bg-red-500' : 'bg-white/20'} flex items-center justify-center backdrop-blur-sm`}>
                    <Heart className={`h-6 w-6 ${currentReel.liked_by_user ? 'fill-white' : ''} text-white`} />
                  </div>
                  <span className="text-white text-xs font-medium">{currentReel.likes_count}</span>
                </button>

                <button className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">0</span>
                </button>

                <button
                  onClick={() => handleShare(currentReel)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Share2 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">{currentReel.shares_count}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedReel(currentReel)
                    setShowFlagModal(true)
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Flag className="h-5 w-5 text-white" />
                  </div>
                </button>

                <div className="flex flex-col items-center gap-1 mt-2">
                  <Eye className="h-4 w-4 text-white" />
                  <span className="text-white text-xs">{currentReel.views_count}</span>
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
                  <Textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
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
                  <Textarea
                    value={flagDescription}
                    onChange={(e) => setFlagDescription(e.target.value)}
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
