import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { Star, Award, CheckCircle, Users, Calendar, MessageCircle } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'

interface Review {
  id: string
  rating: number
  review_text: string
  created_at: string
  reviewer: {
    full_name: string
  }
}

interface ScholarProfile {
  id: string
  full_name: string
  email: string
  role: string
  bio: string
  specializations: string[]
  phone_verified: boolean
  email_verified: boolean
  face_verified: boolean
  certificate_verified: boolean
  smileid_verified: boolean
  average_rating: number
  total_ratings: number
  completed_consultations_count: number
  created_at: string
}

export const ScholarProfileViewer: React.FC = () => {
  const { scholarId } = useParams<{ scholarId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [scholar, setScholar] = useState<ScholarProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewFilter, setReviewFilter] = useState<number | 'all'>('all')

  useEffect(() => {
    if (scholarId) {
      fetchScholarProfile()
      fetchReviews()
    }
  }, [scholarId])

  const fetchScholarProfile = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', scholarId)
        .single()

      if (fetchError) throw fetchError

      setScholar(data)
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching scholar profile:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const query = supabase
        .from('scholar_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(full_name)
        `)
        .eq('scholar_id', scholarId)
        .order('created_at', { ascending: false })

      if (reviewFilter !== 'all') {
        query.eq('rating', reviewFilter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setReviews(data || [])
    } catch (err: any) {
      console.error('Error fetching reviews:', err)
    }
  }

  useEffect(() => {
    if (scholarId) {
      fetchReviews()
    }
  }, [reviewFilter])

  const handleBookConsultation = () => {
    navigate(`/book-consultation?scholarId=${scholarId}`)
  }

  const handleMessageScholar = () => {
    navigate(`/messages/${scholarId}`)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++
    })
    return distribution
  }

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p>Loading scholar profile...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !scholar) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">{error || 'Scholar not found'}</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const distribution = getRatingDistribution()
  const isOwnProfile = profile?.id === scholarId

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl flex items-center gap-3">
                {scholar.full_name}
                {scholar.smileid_verified && (
                  <span title="Verified Scholar">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                  {scholar.role.charAt(0).toUpperCase() + scholar.role.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Rating Overview */}
          <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-600">
                {scholar.average_rating > 0 ? scholar.average_rating.toFixed(1) : 'N/A'}
              </div>
              <div className="flex justify-center mt-2">
                {renderStars(Math.round(scholar.average_rating))}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {scholar.total_ratings} {scholar.total_ratings === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-sm w-8">{stars}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${
                          scholar.total_ratings > 0
                            ? (distribution[stars as keyof typeof distribution] / scholar.total_ratings) * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8">
                    {distribution[stars as keyof typeof distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">Completed Consultations</span>
              </div>
              <div className="text-2xl font-bold">{scholar.completed_consultations_count}</div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Award className="w-4 h-4" />
                <span className="text-sm">Verification Status</span>
              </div>
              <div className="text-sm font-semibold">
                {scholar.smileid_verified ? (
                  <span className="text-green-600">✓ Fully Verified</span>
                ) : (
                  <span className="text-gray-500">Pending</span>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Member Since</span>
              </div>
              <div className="text-sm font-semibold">
                {new Date(scholar.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long'
                })}
              </div>
            </div>
          </div>

          {/* Bio */}
          {scholar.bio && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-gray-700">{scholar.bio}</p>
            </div>
          )}

          {/* Specializations */}
          {scholar.specializations && scholar.specializations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Specializations</h3>
              <div className="flex flex-wrap gap-2">
                {scholar.specializations.map((spec, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verification Badges */}
          <div>
            <h3 className="font-semibold mb-2">Verification</h3>
            <div className="flex flex-wrap gap-3">
              {scholar.phone_verified && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Phone Verified
                </span>
              )}
              {scholar.email_verified && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Email Verified
                </span>
              )}
              {scholar.face_verified && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Face Verified
                </span>
              )}
              {scholar.certificate_verified && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Credentials Verified
                </span>
              )}
            </div>
          </div>
        </CardContent>

        {!isOwnProfile && (
          <CardFooter className="flex gap-3">
            <Button onClick={handleBookConsultation} className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              Book Consultation
            </Button>
            <Button onClick={handleMessageScholar} variant="outline" className="flex-1">
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reviews & Ratings</CardTitle>
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-1 border rounded"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No reviews yet. Be the first to leave a review after your consultation!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{review.reviewer.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.review_text && (
                    <p className="text-gray-700 mt-2">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
