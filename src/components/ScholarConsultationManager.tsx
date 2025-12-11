import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from './ProtectedRoute'
import { Calendar, Clock, MessageSquare, CheckCircle, XCircle, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'

interface ConsultationBooking {
  id: string
  userId: string
  userName: string
  userEmail: string
  date: string
  time: string
  topic: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  fee: number
  bookedAt: string
}

export const ScholarConsultationManager: React.FC = () => {
  const { profile } = useAuth()
  const permissions = usePermissions()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<ConsultationBooking[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all')
  const [loading, setLoading] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean>(!!profile?.is_online)
  const [isBusy, setIsBusy] = useState<boolean>(false)

  useEffect(() => {
    fetchBookings()
    // Subscribe to consultation bookings to reflect busy state and booking updates
    const channel = supabase
      .channel('consultation-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultation_bookings', filter: profile?.id ? `scholar_id=eq.${profile.id}` : undefined }, () => {
        fetchBookings()
        refreshBusyState()
      })
      .subscribe()

    refreshBusyState()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const refreshBusyState = async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('consultation_bookings')
      .select('id, status')
      .eq('scholar_id', profile.id)
      .eq('status', 'confirmed')
      .limit(1)
    const active = (data || []).length > 0
    setIsBusy(active)
  }

  const toggleAvailability = async () => {
    if (!profile?.id) return
    const next = !isAvailable
    setIsAvailable(next)
    await supabase
      .from('profiles')
      .update({ is_online: next })
      .eq('id', profile.id)
  }

  const fetchBookings = async () => {
    if (!profile?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('consultation_bookings')
        .select('*, user:profiles!user_id(full_name, email), amount_paid')
        .eq('scholar_id', profile.id)
        .order('booking_date', { ascending: false })

      if (error) throw error

      const formattedBookings = (data || []).map((b: any) => ({
        id: b.id,
        userId: b.user_id,
        userName: b.user?.full_name || 'Unknown',
        userEmail: b.user?.email || '',
        date: b.booking_date || '',
        time: b.booking_time || '',
        topic: b.topic || 'No topic',
        status: b.status || 'pending',
        fee: b.amount_paid || 0,
        bookedAt: b.created_at || new Date().toISOString(),
      }))

      setBookings(formattedBookings)
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const confirmBooking = async (bookingId: string) => {
    setLoading(true)
    try {
      console.log('✅ Confirming booking:', bookingId)
      
      const { error } = await supabase
        .from('consultation_bookings')
        .update({ 
          status: 'confirmed',
          scholar_accepted: true
        })
        .eq('id', bookingId)

      if (error) {
        console.error('❌ Error confirming booking:', error)
        throw error
      }

      console.log('✅ Booking confirmed successfully')
      
      await fetchBookings()
      await refreshBusyState()
    } catch (err: any) {
      console.error('❌ Error confirming booking:', err)
      alert('Failed to confirm booking: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('consultation_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error
      
      await fetchBookings()
    } catch (err) {
      console.error('Error cancelling booking:', err)
      alert('Failed to cancel booking')
    } finally {
      setLoading(false)
    }
  }

  const completeBooking = async (bookingId: string) => {
    setLoading(true)
    try {
      console.log('🎯 Marking consultation as complete:', bookingId)
      
      const { error } = await supabase
        .from('consultation_bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (error) {
        console.error('❌ Error updating booking status:', error)
        throw error
      }

      console.log('✅ Booking status updated to completed')

      // Set scholar back online after completing consultation
      if (profile?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_online: true })
          .eq('id', profile.id)

        if (profileError) {
          console.error('⚠️ Error setting scholar online:', profileError)
        } else {
          console.log('✅ Scholar set back online')
          setIsAvailable(true)
        }
      }
      
      await fetchBookings()
      await refreshBusyState()
      
      console.log('🎉 Consultation marked as complete successfully!')
    } catch (err: any) {
      console.error('❌ Error completing booking:', err)
      alert('Failed to complete booking: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter)

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    totalEarnings: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.fee * 100), 0),
  }

  if (!permissions.canManageConsultations) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive mb-2">
              Access Denied: Only scholars and imams can manage consultation bookings.
            </p>
            <p className="text-sm text-muted-foreground">
              Your current role: {profile?.role}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <MobileLayout title="Manage Consultations">
    <div className="container mx-auto p-4 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Consultation Bookings
          </CardTitle>
          <CardDescription>
            Manage your consultation appointments and schedule
          </CardDescription>
          <div className="mt-4 flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded ${isBusy ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              {isBusy ? 'Busy: In Session' : 'Available'}
            </span>
            <Button variant={isAvailable ? 'default' : 'outline'} size="sm" onClick={toggleAvailability}>
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-3 bg-secondary rounded-lg text-center">
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <p className="text-xl font-bold text-yellow-800">{stats.pending}</p>
              <p className="text-xs text-yellow-800">Pending</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-xl font-bold text-blue-800">{stats.confirmed}</p>
              <p className="text-xs text-blue-800">Confirmed</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-xl font-bold text-green-800">{stats.completed}</p>
              <p className="text-xs text-green-800">Completed</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-center col-span-2 sm:col-span-1">
              <p className="text-xl font-bold text-primary">₦{stats.totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-primary">Earnings</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs px-2.5 py-1.5 h-8"
            >
              All ({bookings.length})
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
              className="text-xs px-2.5 py-1.5 h-8"
            >
              Pending ({stats.pending})
            </Button>
            <Button
              variant={filter === 'confirmed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('confirmed')}
              className="text-xs px-2.5 py-1.5 h-8"
            >
              Confirmed ({stats.confirmed})
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
              className="text-xs px-2.5 py-1.5 h-8"
            >
              Done ({stats.completed})
            </Button>
          </div>

          {/* Bookings list */}
          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {filter !== 'all' ? filter : ''} bookings</p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{booking.userName}</h3>
                      <p className="text-sm text-muted-foreground mb-1">{booking.userEmail}</p>
                      <p className="text-sm mb-2">{booking.topic}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(booking.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {booking.time}
                        </div>
                        <span className="font-semibold text-primary">
                          ₦{(booking.fee * 100).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {booking.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => confirmBooking(booking.id)}
                          disabled={loading}
                          className="flex-1 min-w-[100px]"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Confirm</span>
                          <span className="sm:hidden">✓</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelBooking(booking.id)}
                          disabled={loading}
                          className="flex-1 min-w-[100px]"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Decline</span>
                          <span className="sm:hidden">✗</span>
                        </Button>
                      </>
                    )}
                    {booking.status === 'confirmed' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/consultation/${booking.id}/messages`)}
                          className="flex-1 min-w-[80px]"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Chat</span>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => completeBooking(booking.id)}
                          disabled={loading}
                          className="flex-1 min-w-[100px]"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Complete</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelBooking(booking.id)}
                          disabled={loading}
                          className="flex-1 min-w-[80px]"
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Cancel</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </MobileLayout>
  )
}
