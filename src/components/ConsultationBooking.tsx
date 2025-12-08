import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { usePermissions } from './ProtectedRoute'
import { Calendar, Clock, MessageSquare } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
import { supabase } from '../utils/supabase/client'
import { useAuth } from '../contexts/AuthContext'
import { initializePaystackPayment, generatePaymentReference } from '../utils/paystack'

interface Scholar {
  id: string
  name: string
  specialization: string
  availableSlots: string[]
  consultationFee: number
  consultationDuration?: number
  isOnline?: boolean
}

interface Booking {
  id: string
  scholarId: string
  scholarName: string
  date: string
  time: string
  topic: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
}

export const ConsultationBooking: React.FC = () => {
  const permissions = usePermissions()
  const { profile } = useAuth()
  const [scholars, setScholars] = useState<Scholar[]>([])
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [topic, setTopic] = useState('')
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showMyBookings, setShowMyBookings] = useState(false)

  useEffect(() => {
    fetchScholars()
    fetchMyBookings()

    // Subscribe to realtime updates on consultation bookings
    const subscription = supabase
      .channel('consultation-bookings-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'consultation_bookings',
        filter: profile?.id ? `user_id=eq.${profile.id}` : undefined
      }, () => {
        fetchMyBookings()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchScholars = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, specializations, consultation_fee, consultation_duration, available_slots, is_online')
        .in('role', ['scholar', 'imam'])
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
          availableSlots: Array.isArray(s.available_slots) && s.available_slots.length > 0 
            ? s.available_slots 
            : ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
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
      if (!profile?.id) return
      const { data, error } = await supabase
        .from('consultation_bookings')
        .select('*, scholar:profiles!scholar_id(full_name)')
        .eq('user_id', profile.id)
        .order('booking_date', { ascending: false })
        .limit(10)
      if (error) throw error
      const formattedBookings = (data || []).map((b: any) => ({
        id: b.id,
        scholarId: b.scholar_id,
        scholarName: b.scholar?.full_name || 'Unknown',
        date: b.booking_date,
        time: b.booking_time,
        topic: b.topic || 'No topic specified',
        status: b.status || 'pending'
      }))
      setMyBookings(formattedBookings)
    } catch (err) {
      console.error('Error fetching bookings:', err)
    }
  }

  const handleBooking = async () => {
    if (!permissions.canBookConsultation) {
      setError('Only members can book consultations')
      return
    }

    if (!selectedScholar || !selectedDate || !selectedTime || !topic.trim()) {
      setError('Please fill in all fields')
      return
    }

    if (!profile?.id) {
      setError('User not authenticated')
      return
    }

    setError('')
    setLoading(true)

    try {
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

      // Add coins to scholar's balance
      const { data: scholarProfile, error: scholarProfileError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', selectedScholar.id)
        .single()

      if (scholarProfileError) throw new Error('Failed to fetch scholar balance')

      const scholarBalance = scholarProfile?.masjid_coin_balance || 0
      const newScholarBalance = scholarBalance + coinsRequired

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newScholarBalance })
        .eq('id', selectedScholar.id)

      if (creditError) throw new Error('Failed to credit scholar')

      // Create transaction record for user (debit)
      await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: profile.id,
          recipient_id: selectedScholar.id,
          amount: -coinsRequired,
          type: 'consultation',
          description: `Consultation with ${selectedScholar.name}`,
          payment_reference: paymentReference,
          payment_status: 'success',
          status: 'completed'
        })

      // Create transaction record for scholar (credit)
      await supabase
        .from('masjid_coin_transactions')
        .insert({
          user_id: selectedScholar.id,
          recipient_id: profile.id,
          amount: coinsRequired,
          type: 'consultation',
          description: `Consultation fee from ${profile.full_name}`,
          payment_reference: paymentReference,
          payment_status: 'success',
          status: 'completed'
        })

      // Create confirmed booking with consultation duration
      const { error: bookingError } = await supabase
        .from('consultation_bookings')
        .insert({
          id: bookingId,
          user_id: profile.id,
          scholar_id: selectedScholar.id,
          booking_date: selectedDate,
          booking_time: selectedTime,
          topic: topic,
          payment_status: 'success',
          payment_reference: paymentReference,
          amount_paid: coinsRequired,
          consultation_duration: selectedScholar.consultationDuration || 30,
          status: 'confirmed'
        })

      if (bookingError) throw bookingError

      // Success!
      setSuccess(true)
      setSelectedScholar(null)
      setSelectedDate('')
      setSelectedTime('')
      setTopic('')
      
      // Refresh bookings
      await fetchMyBookings()
      
      setTimeout(() => setSuccess(false), 5000)

    } catch (err: any) {
      console.error('Booking error:', err)
      setError(err.message || 'Failed to book consultation')
    } finally {
      setLoading(false)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    try {
      // TODO: API call to cancel booking
      setMyBookings(myBookings.filter(b => b.id !== bookingId))
    } catch (err) {
      console.error('Error cancelling booking:', err)
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
          onClick={() => setShowMyBookings(true)}
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
              Schedule a private consultation with our scholars and imams
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
                      <p className="text-muted-foreground mb-2">No scholars available at the moment</p>
                      <p className="text-sm text-muted-foreground">
                        Scholars need to be online and have consultation fees set to accept bookings.
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
                                💰 {Math.floor(scholar.consultationFee * 0.01).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">coins (₦{scholar.consultationFee.toLocaleString()})</p>
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
                    {/* Date selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Select Date
                      </label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    {/* Time selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Select Time Slot
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {selectedScholar.availableSlots.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            onClick={() => setSelectedTime(time)}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>

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
                  </>
                )}

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleBooking}
                  disabled={loading || !selectedScholar || !selectedDate || !selectedTime || !topic}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Processing...' : `Book & Pay ₦${selectedScholar?.consultationFee || 0}`}
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
            {myBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No consultation bookings yet</p>
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
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(booking.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {booking.time}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          booking.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status}
                        </span>
                        {booking.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelBooking(booking.id)}
                          >
                            Cancel
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
