import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { usePermissions } from './ProtectedRoute'
import { Calendar, Clock, MessageSquare } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { initializePaystackPayment, generatePaymentReference } from '../utils/paystack'
import { notifyConsultationBooked } from '../utils/pushNotifications'
import { useNavigate } from 'react-router-dom'

interface Scholar {
  id: string
  name: string
  specialization: string
  consultationFee: number
  consultationDuration?: number
  isOnline?: boolean
}

interface Booking {
  id: string
  scholarId: string
  scholarName: string
  topic: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
  sessionStarted: boolean
  scholarAccepted: boolean
  amountPaid: number
}

export const ConsultationBooking: React.FC = () => {
  const permissions = usePermissions()
  const { profile } = useAuth()
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const [scholars, setScholars] = useState<Scholar[]>([])
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null)
  const [topic, setTopic] = useState('')
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showMyBookings, setShowMyBookings] = useState(false)

  useEffect(() => {
    fetchScholars()
  }, [])

  useEffect(() => {
    if (!profile?.id) return

    console.log('Profile loaded, fetching bookings for:', profile.id)
    fetchMyBookings()

    // Subscribe to realtime updates on consultation bookings
    const subscription = supabase
      .channel(`consultation-bookings-updates-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'consultation_bookings',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        console.log('Booking update detected, refreshing...')
        fetchMyBookings()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [profile?.id])

  const fetchScholars = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, specializations, consultation_fee, consultation_duration, is_online')
        .in('role', ['scholar', 'imam'])
        .eq('is_online', true)
        .order('full_name')
      
      if (error) {
        console.error('Supabase error:', error)
        setError(`Failed to load scholars: ${error.message}`)
        throw error
      }
      
      console.log('Fetched scholars:', data) // Debug log
      
      if (!data || data.length === 0) {
        console.log('No scholars found in database')
        setScholars([])
        return
      }
      
      const formattedScholars = (data || []).map((s: any) => {
        const fee = typeof s.consultation_fee === 'number' ? s.consultation_fee : Number(s.consultation_fee || 0)
        console.log(`Scholar ${s.full_name}: fee = ${s.consultation_fee}, parsed = ${fee}`) // Debug log
        return {
          id: s.id,
          name: s.full_name,
          specialization: Array.isArray(s.specializations) && s.specializations.length > 0 ? s.specializations[0] : 'Islamic Studies',
          consultationFee: fee,
          consultationDuration: s.consultation_duration || 30,
          isOnline: s.is_online || false
        }
      })
      
      // Filter scholars with fees > 0
      const scholarsWithFees = formattedScholars.filter(s => s.consultationFee > 0)
      console.log('Scholars with fees:', scholarsWithFees) // Debug log
      setScholars(scholarsWithFees)
      
      if (scholarsWithFees.length === 0) {
        console.log('No scholars with consultation fees set')
      }
    } catch (err: any) {
      console.error('Error fetching scholars:', err)
      setError(`Failed to load scholars: ${err.message || 'Unknown error'}`)
    }
  }

  const fetchMyBookings = async () => {
    try {
      if (!profile?.id) {
        console.log('No profile ID available')
        return
      }
      
      console.log('Fetching bookings for user:', profile.id)
      
      const { data, error } = await supabase
        .from('consultation_bookings')
        .select('*, scholar:profiles!scholar_id(full_name)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) {
        console.error('Supabase error fetching bookings:', error)
        throw error
      }
      
      console.log('Fetched bookings:', data)
      
      if (!data || data.length === 0) {
        console.log('No bookings found for user')
        setMyBookings([])
        return
      }
      
      const formattedBookings = (data || []).map((b: any) => ({
        id: b.id,
        scholarId: b.scholar_id,
        scholarName: b.scholar?.full_name || 'Unknown',
        topic: b.topic || 'No topic specified',
        status: b.status || 'pending',
        createdAt: b.created_at,
        sessionStarted: !!b.session_started_at,
        scholarAccepted: b.scholar_accepted || false,
        amountPaid: b.amount_paid || 0
      }))
      
      console.log('Formatted bookings:', formattedBookings)
      setMyBookings(formattedBookings)
    } catch (err: any) {
      console.error('Error fetching bookings:', err)
      setError(`Failed to load bookings: ${err.message}`)
    }
  }

  const handleBooking = async () => {
    if (!permissions.canBookConsultation) {
      setError('Only members can book consultations')
      return
    }

    if (!selectedScholar || !topic.trim()) {
      setError('Please select a scholar and enter a topic')
      return
    }

    if (!selectedScholar.isOnline) {
      setError('Scholar is currently offline. Please try again when they are online.')
      return
    }

    if (!profile?.id) {
      setError('User not authenticated')
      return
    }

    setError('')
    setLoading(true)

    try {
      // Check for existing active bookings with this scholar
      const { data: existingBookings, error: checkError } = await supabase
        .from('consultation_bookings')
        .select('id, status')
        .eq('user_id', profile.id)
        .eq('scholar_id', selectedScholar.id)
        .in('status', ['pending', 'confirmed'])

      if (checkError) throw checkError

      if (existingBookings && existingBookings.length > 0) {
        throw new Error(`You already have an active booking with ${selectedScholar.name}. Please cancel it first or wait for it to complete.`)
      }

      const bookingId = crypto.randomUUID()
      const paymentReference = `CONSULT_${profile.id}_${Date.now()}`
      const CONVERSION_RATE = 0.01 // 100 Naira = 1 Coin
      const coinsRequired = Math.floor(selectedScholar.consultationFee * CONVERSION_RATE)

      // Check user's Masjid Coin balance
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', profile.id)
        .single()

      if (profileError) throw new Error('Failed to fetch your balance')

      const currentBalance = userProfile?.masjid_coin_balance || 0

      if (currentBalance < coinsRequired) {
        throw new Error(`Insufficient balance. You need ${coinsRequired} coins (₦${selectedScholar.consultationFee}) but have ${currentBalance} coins. Please deposit more coins.`)
      }

      // Deduct coins from user's balance
      const newUserBalance = currentBalance - coinsRequired
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newUserBalance })
        .eq('id', profile.id)

      if (deductError) throw new Error('Failed to deduct coins from your balance')

      // IMPORTANT: Create booking FIRST before handling money
      // This way if booking fails, no coins are transferred
      const now = new Date().toISOString()
      const { error: bookingError } = await supabase
        .from('consultation_bookings')
        .insert({
          id: bookingId,
          user_id: profile.id,
          scholar_id: selectedScholar.id,
          booking_date: now.split('T')[0],
          booking_time: now.split('T')[1].substring(0, 5),
          topic: topic,
          payment_status: 'completed',
          payment_reference: paymentReference,
          amount_paid: coinsRequired,
          consultation_duration: selectedScholar.consultationDuration || 30,
          status: 'pending',
          scholar_accepted: false
        })

      // If booking creation fails, restore user's balance and exit
      if (bookingError) {
        console.error('❌ Booking creation failed:', bookingError)
        // Rollback: restore user's coins
        await supabase
          .from('profiles')
          .update({ masjid_coin_balance: currentBalance })
          .eq('id', profile.id)
        
        throw new Error(bookingError.message || 'Failed to create booking')
      }
      
      console.log('✅ Booking created successfully')

      // Booking created successfully, now transfer coins to scholar
      const { data: scholarProfile, error: scholarProfileError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', selectedScholar.id)
        .single()

      if (scholarProfileError) {
        console.error('❌ Failed to fetch scholar balance:', scholarProfileError)
        throw new Error('Failed to fetch scholar balance')
      }

      const scholarBalance = scholarProfile?.masjid_coin_balance || 0
      const newScholarBalance = scholarBalance + coinsRequired

      console.log(`💰 Transferring ${coinsRequired} coins to scholar (${scholarBalance} → ${newScholarBalance})`)

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newScholarBalance })
        .eq('id', selectedScholar.id)

      if (creditError) {
        console.error('❌ Failed to credit scholar:', creditError)
        throw new Error('Failed to credit scholar')
      }

      console.log('✅ Scholar credited successfully')

      // Create transaction record for user (debit)
      const { error: debitTxError } = await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: profile.id,
          recipient_id: selectedScholar.id,
          amount: -coinsRequired,
          type: 'consultation',
          description: `Consultation with ${selectedScholar.name}`,
          payment_reference: paymentReference,
          payment_status: 'completed',
          status: 'completed'
        })

      if (debitTxError) {
        console.error('⚠️ Failed to create debit transaction record:', debitTxError)
      } else {
        console.log('✅ Debit transaction recorded')
      }

      // Create transaction record for scholar (credit)
      // IMPORTANT: user_id is who receives, recipient_id should match for filtering
      const { error: creditTxError } = await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: selectedScholar.id,  // Scholar is the receiver
          recipient_id: selectedScholar.id,  // For wallet filtering
          amount: coinsRequired,  // Positive amount for income
          type: 'consultation',
          description: `Consultation fee from ${profile.full_name}`,
          payment_reference: paymentReference,
          payment_status: 'completed',
          status: 'completed'
        })

      if (creditTxError) {
        console.error('⚠️ Failed to create credit transaction record:', creditTxError)
      } else {
        console.log('✅ Credit transaction recorded for scholar')
      }

      // Success!
      console.log('🎉 Booking completed successfully!')
      setSuccess(true)
      setSelectedScholar(null)
      setTopic('')
      
      // Show notification
      showNotification(
        `Payment successful! ${coinsRequired} coins deducted. Redirecting to chat...`,
        'payment'
      )
      
      // Send push notification to scholar
      await notifyConsultationBooked(selectedScholar.name, selectedScholar.consultationDuration || 30)
      
      // Refresh bookings
      await fetchMyBookings()
      
      // Navigate to chatbox after short delay
      setTimeout(() => {
        navigate(`/consultation/${bookingId}/messages`)
      }, 1500)

    } catch (err: any) {
      console.error('Booking error:', err)
      setError(err.message || 'Failed to book consultation')
    } finally {
      setLoading(false)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    try {
      const booking = myBookings.find(b => b.id === bookingId)
      if (!booking) return

      // Check if session has started - can't cancel after session starts
      if (booking.sessionStarted) {
        showNotification('Cannot cancel consultation after session has started', 'error')
        return
      }

      if (!confirm(`Cancel consultation with ${booking.scholarName}? You will be refunded ${booking.amountPaid} coins.`)) {
        return
      }

      setLoading(true)

      // Fetch booking details to get scholar_id and amount
      const { data: bookingData, error: fetchError } = await supabase
        .from('consultation_bookings')
        .select('scholar_id, amount_paid, user_id')
        .eq('id', bookingId)
        .single()

      if (fetchError) throw fetchError

      const coinsToRefund = bookingData.amount_paid || 0

      // Update booking status to cancelled
      const { error: cancelError } = await supabase
        .from('consultation_bookings')
        .update({ status: 'cancelled', payment_status: 'refunded' })
        .eq('id', bookingId)

      if (cancelError) throw cancelError

      // Refund coins to user
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', bookingData.user_id)
        .single()

      if (userError) throw userError

      const newUserBalance = (userProfile?.masjid_coin_balance || 0) + coinsToRefund
      await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newUserBalance })
        .eq('id', bookingData.user_id)

      // Deduct coins from scholar
      const { data: scholarProfile, error: scholarError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', bookingData.scholar_id)
        .single()

      if (scholarError) throw scholarError

      const newScholarBalance = Math.max(0, (scholarProfile?.masjid_coin_balance || 0) - coinsToRefund)
      await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newScholarBalance })
        .eq('id', bookingData.scholar_id)

      // Create refund transaction records
      await supabase.from('masjid_coin_transactions').insert([
        {
          user_id: bookingData.user_id,
          recipient_id: bookingData.scholar_id,
          amount: coinsToRefund,
          type: 'refund',
          description: `Refund for cancelled consultation with ${booking.scholarName}`,
          status: 'completed'
        },
        {
          user_id: bookingData.scholar_id,
          recipient_id: bookingData.user_id,
          amount: -coinsToRefund,
          type: 'refund',
          description: `Refund issued for cancelled consultation`,
          status: 'completed'
        }
      ])

      showNotification(`Consultation cancelled. ${coinsToRefund} coins refunded to your account.`, 'success')
      await fetchMyBookings()
    } catch (err: any) {
      console.error('Error cancelling booking:', err)
      showNotification(err.message || 'Failed to cancel booking', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!permissions.canBookConsultation) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive mb-2">
              Access Denied: Only members can book consultations.
            </p>
            <p className="text-sm text-muted-foreground">
              Scholars and imams manage consultations but cannot book them.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <MobileLayout title="Consultations">
      <div className="flex gap-4 mb-4">
        <Button
          variant={!showMyBookings ? 'default' : 'outline'}
          onClick={() => setShowMyBookings(false)}
        >
          Book Consultation
        </Button>
        <Button
          variant={showMyBookings ? 'default' : 'outline'}
          onClick={() => {
            setShowMyBookings(true)
            fetchMyBookings() // Refresh bookings when clicking
          }}
        >
          My Bookings ({myBookings.length})
        </Button>
      </div>

      {!showMyBookings ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Book a Consultation
            </CardTitle>
            <CardDescription>
              Book an instant consultation with available scholars and imams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {success ? (
              <div className="p-6 bg-primary/10 border border-primary rounded-lg text-center">
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
                <p className="text-muted-foreground mb-2">
                  Your consultation has been booked successfully.
                </p>
                <p className="text-sm text-emerald-600 font-semibold">
                  ✓ Paid with Masjid Coins
                </p>
              </div>
            ) : (
              <>
                {/* Scholar selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Scholar/Imam
                  </label>
                  {scholars.length === 0 ? (
                    <div className="p-6 bg-muted/50 border rounded-lg text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">No scholars online at the moment</p>
                      <p className="text-sm text-muted-foreground">
                        Scholars must be online to accept instant consultations. Please check back later.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {scholars.map((scholar) => (
                        <div
                          key={scholar.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedScholar?.id === scholar.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedScholar(scholar)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{scholar.name}</p>
                                {scholar.isOnline && (
                                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                    Online
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {scholar.specialization}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                                ₦{scholar.consultationFee.toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">{Math.floor(scholar.consultationFee * 0.01)} coins</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Show user balance */}
                {profile && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Your Masjid Coin Balance:</span>
                      <span className="text-lg font-bold text-emerald-600">
                        💰 {(profile.masjid_coin_balance || 0).toLocaleString()} coins
                      </span>
                    </div>
                  </div>
                )}

                {selectedScholar && (
                  <>
                    {/* Topic */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Consultation Topic
                      </label>
                      <Input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Brief description of what you'd like to discuss..."
                      />
                    </div>
                    
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        ℹ️ This will start an instant consultation with {selectedScholar.name}. 
                        Duration: {selectedScholar.consultationDuration || 30} minutes
                      </p>
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleBooking}
                  disabled={loading || !selectedScholar || !topic || !selectedScholar?.isOnline}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Processing...' : `Start Consultation & Pay ₦${selectedScholar?.consultationFee || 0}`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>My Consultations</CardTitle>
            <CardDescription>View and manage your consultation bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading bookings...</p>
              </div>
            ) : myBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No consultation bookings yet</p>
                <p className="text-sm mt-2">Book a consultation with an online scholar to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{booking.scholarName}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{booking.topic}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(booking.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          booking.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.sessionStarted ? 'Session Active' : booking.status}
                        </span>
                        
                        {/* Join Chat button for pending/confirmed bookings */}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/consultation/${booking.id}/messages`)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            💬 Join Chat
                          </Button>
                        )}
                        
                        {/* Cancel button - only show if session hasn't started */}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && !booking.sessionStarted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelBooking(booking.id)}
                            disabled={loading}
                          >
                            Cancel & Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </MobileLayout>
  )
}
