import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { Calendar, Clock, User, MapPin, MessageCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'

interface ConsultationBooking {
  id: string
  scholar_id: string
  scheduled_at: string
  topic: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  scholar: {
    full_name: string
    specializations: string[]
  }
}

interface ActivityBooking {
  id: string
  activity_id: string
  booking_date: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  activity: {
    title: string
    category: string
    location: string
    organizer_id: string
    organizer: {
      full_name: string
    }
  }
}

export const MyBookings: React.FC = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([])
  const [activityBookings, setActivityBookings] = useState<ActivityBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'consultations' | 'activities'>('consultations')

  useEffect(() => {
    fetchBookings()
  }, [profile?.id])

  const fetchBookings = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)

      // Fetch consultation bookings
      const { data: consultationData, error: consultationError } = await supabase
        .from('consultation_bookings')
        .select(`
          *,
          scholar:profiles!scholar_id(full_name, specializations)
        `)
        .eq('user_id', profile.id)
        .order('scheduled_at', { ascending: false })

      if (consultationError) throw consultationError

      // Fetch activity bookings
      const { data: activityData, error: activityError } = await supabase
        .from('activity_bookings')
        .select(`
          *,
          activity:activities!activity_id(
            title,
            category,
            location,
            organizer_id,
            organizer:profiles!organizer_id(full_name)
          )
        `)
        .eq('user_id', profile.id)
        .order('booking_date', { ascending: false })

      if (activityError) throw activityError

      setConsultations(consultationData || [])
      setActivityBookings(activityData || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const handleCancelConsultation = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this consultation?')) return

    try {
      const { error } = await supabase
        .from('consultation_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      await fetchBookings()
    } catch (error) {
      console.error('Error cancelling consultation:', error)
      alert('Failed to cancel consultation')
    }
  }

  const handleCancelActivity = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this activity booking?')) return

    try {
      const { error } = await supabase
        .from('activity_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      await fetchBookings()
    } catch (error) {
      console.error('Error cancelling activity:', error)
      alert('Failed to cancel activity booking')
    }
  }

  if (loading) {
    return (
      <MobileLayout title="My Bookings">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Loading your bookings...</p>
          </CardContent>
        </Card>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="My Bookings">
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
          <Button
            variant={activeTab === 'consultations' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setActiveTab('consultations')}
          >
            Consultations ({consultations.length})
          </Button>
          <Button
            variant={activeTab === 'activities' ? 'default' : 'ghost'}
            className="flex-1"
            onClick={() => setActiveTab('activities')}
          >
            Activities ({activityBookings.length})
          </Button>
        </div>

        {/* Consultations Tab */}
        {activeTab === 'consultations' && (
          <div className="space-y-3">
            {consultations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No consultation bookings yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => navigate('/available-scholars')}
                  >
                    Book a Consultation
                  </Button>
                </CardContent>
              </Card>
            ) : (
              consultations.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {booking.scholar.full_name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {booking.scholar.specializations?.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(booking.status)}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{new Date(booking.scheduled_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{new Date(booking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {booking.topic && (
                        <div className="text-sm">
                          <span className="font-semibold">Topic:</span> {booking.topic}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      {booking.status === 'confirmed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => navigate(`/messages/${booking.scholar_id}`)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Message
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleCancelConsultation(booking.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {booking.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleCancelConsultation(booking.id)}
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="space-y-3">
            {activityBookings.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No activity bookings yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => navigate('/activity-categories')}
                  >
                    Browse Activities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activityBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{booking.activity.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          by {booking.activity.organizer.full_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(booking.status)}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {booking.activity.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span>{booking.activity.location}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {(booking.status === 'confirmed' || booking.status === 'pending') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleCancelActivity(booking.id)}
                        >
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  )
}
