import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { Star, Check } from 'lucide-react'

interface ReviewSubmissionFormProps {
  consultationId?: string
  streamId?: string
  scholarId: string
  scholarName: string
  onSuccess?: () => void
  onCancel?: () => void
}

export const ReviewSubmissionForm: React.FC<ReviewSubmissionFormProps> = ({
  consultationId,
  streamId,
  scholarId,
  scholarName,
  onSuccess,
  onCancel
}) => {
  const { profile } = useAuth()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [loading, setLoading] = useState(false)
  const [canReview, setCanReview] = useState(false)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [eventCompleted, setEventCompleted] = useState(false)
  const reviewType = consultationId ? 'consultation' : 'livestream'

  useEffect(() => {
    checkEligibility()
  }, [consultationId, streamId])

  const checkEligibility = async () => {
    try {
      let isCompleted = false

      if (consultationId) {
        // Check if consultation is completed
        const { data: consultation, error: consultError } = await supabase
          .from('consultations')
          .select('status, actual_ended_at')
          .eq('id', consultationId)
          .single()

        if (consultError) throw consultError

        isCompleted = consultation.status === 'completed' && !!consultation.actual_ended_at
      } else if (streamId) {
        // Check if livestream has ended
        const { data: stream, error: streamError } = await supabase
          .from('streams')
          .select('is_active, ended_at')
          .eq('id', streamId)
          .single()

        if (streamError) throw streamError

        isCompleted = !stream.is_active && !!stream.ended_at
        
        // Also verify user was a participant
        if (isCompleted) {
          const { data: participation } = await supabase
            .from('stream_participants')
            .select('id')
            .eq('stream_id', streamId)
            .eq('user_id', profile?.id)
            .maybeSingle()
          
          if (!participation) {
            isCompleted = false
          }
        }
      }

      setEventCompleted(isCompleted)

      if (!isCompleted) {
        setCanReview(false)
        return
      }

      // Check if already reviewed
      const query = supabase
        .from('scholar_reviews')
        .select('id')
        .eq('reviewer_id', profile?.id)

      if (consultationId) {
        query.eq('consultation_id', consultationId)
      } else if (streamId) {
        query.eq('stream_id', streamId)
      }

      const { data: existingReview, error: reviewError } = await query.maybeSingle()

      if (reviewError) throw reviewError

      if (existingReview) {
        setAlreadyReviewed(true)
        setCanReview(false)
      } else {
        setCanReview(true)
      }
    } catch (err: any) {
      console.error('Error checking review eligibility:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      alert('Please select a rating')
      return
    }

    if (!reviewText.trim()) {
      alert('Please write a review')
      return
    }

    setLoading(true)

    try {
      const reviewData: any = {
        scholar_id: scholarId,
        reviewer_id: profile?.id,
        rating,
        review_text: reviewText.trim()
      }

      // Add either consultation_id or stream_id
      if (consultationId) {
        reviewData.consultation_id = consultationId
      } else if (streamId) {
        reviewData.stream_id = streamId
      }

      const { error } = await supabase.from('scholar_reviews').insert(reviewData)

      if (error) throw error

      // Send notification to scholar
      await supabase.from('notifications').insert({
        user_id: scholarId,
        title: 'New Review',
        message: `You received a ${rating}-star review from ${profile?.full_name} for a ${reviewType}`,
        notification_type: 'review_received',
        related_id: consultationId || streamId,
        action_url: `/scholar/${scholarId}`
      })

      alert('Review submitted successfully!')
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('Error submitting review:', err)
      alert('Failed to submit review: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = () => {
    return (
      <div className="flex gap-2 justify-center my-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-10 h-10 ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  if (!eventCompleted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <p>You can submit a review after the {reviewType} is completed.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (alreadyReviewed) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">Review Already Submitted</p>
            <p className="text-sm text-gray-600 mt-2">
              You have already reviewed this consultation.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!canReview) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <p>Unable to submit review at this time.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Review Your {reviewType === 'consultation' ? 'Consultation' : 'Livestream'}</CardTitle>
        <p className="text-sm text-gray-600">with {scholarName}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-center">
              How would you rate your experience?
            </label>
            {renderStars()}
            {rating > 0 && (
              <p className="text-center text-sm text-gray-600">
                {rating === 5 && 'Excellent!'}
                {rating === 4 && 'Very Good'}
                {rating === 3 && 'Good'}
                {rating === 2 && 'Fair'}
                {rating === 1 && 'Poor'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Share your experience
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell others about your consultation experience..."
              className="w-full min-h-[120px] p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reviewText.length}/500 characters
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading || rating === 0 || !reviewText.trim()}
              className="flex-1"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
