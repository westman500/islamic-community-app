import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { Calendar, Clock, User, MessageCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'

interface ConsultationBooking {
  id: string
  scholar_id: string
  booking_date: string
  booking_time: string
  topic: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  amount_paid: number
  scholar: {
    full_name: string
    specializations: string[]
  }
}

export const MyBookings: React.FC = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) {
      console.log('No profile ID, skipping fetch')
      return
    }

    console.log('Fetching bookings for profile:', profile.id)
    fetchBookings()

    // Realtime subscription for consultation bookings
    const channel = supabase
      .channel(`my-consultation-bookings-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'consultation_bookings',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        console.log('Consultation booking changed, refreshing...')
        fetchBookings()
      })
      .subscribe((status) => {
        console.log('Subscription status:', status)
      })

    return () => {
      console.log('Unsubscribing from bookings')
      channel.unsubscribe()
    }
  }, [profile?.id])

  const fetchBookings = async () => {
    if (!profile?.id) {
      console.log('No profile ID in fetchBookings')
      return
    }

    try {
      setLoading(true)
      console.log('Fetching consultation bookings for user:', profile.id)

      // Fetch consultation bookings
      const { data: consultationData, error: consultationError } = await supabase
        .from('consultation_bookings')
        .select(`
          *,
          scholar:profiles!scholar_id(full_name, specializations)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (consultationError) {
        console.error('Error fetching consultation bookings:', consultationError)
        throw consultationError
      }

      console.log('Fetched consultations:', consultationData?.length || 0)
      setConsultations(consultationData || [])
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
        {/* Consultations */}
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
                        <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{booking.booking_time}</span>
                      </div>
                      {booking.topic && (
                        <div className="text-sm">
                          <span className="font-semibold">Topic:</span> {booking.topic}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {booking.status === 'confirmed' && booking.payment_status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => navigate(`/consultation/${booking.id}/messages`)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            <span className="hidden xs:inline">Open Chat</span>
                            <span className="xs:hidden">Chat</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 min-w-[100px]"
                            onClick={() => handleCancelConsultation(booking.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && booking.payment_status !== 'completed' && (
                        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                          ⏳ Awaiting payment confirmation
                        </div>
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
      </div>
    </MobileLayout>
  )
}
