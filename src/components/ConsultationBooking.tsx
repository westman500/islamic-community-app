import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { usePermissions } from './ProtectedRoute'
import { Calendar, Clock, MessageSquare } from 'lucide-react'

interface Scholar {
  id: string
  name: string
  specialization: string
  availableSlots: string[]
  consultationFee: number
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
  }, [])

  const fetchScholars = async () => {
    try {
      // TODO: Replace with actual API call
      // Mock data
      setScholars([
        {
          id: 'scholar_1',
          name: 'Imam Abdullah',
          specialization: 'Quran & Tafsir',
          availableSlots: ['10:00', '14:00', '16:00', '18:00'],
          consultationFee: 25,
        },
        {
          id: 'scholar_2',
          name: 'Sheikh Muhammad',
          specialization: 'Fiqh & Hadith',
          availableSlots: ['11:00', '15:00', '17:00'],
          consultationFee: 30,
        },
      ])
    } catch (err) {
      console.error('Error fetching scholars:', err)
    }
  }

  const fetchMyBookings = async () => {
    try {
      // TODO: Replace with actual API call
      // Mock data
      setMyBookings([
        {
          id: 'booking_1',
          scholarId: 'scholar_1',
          scholarName: 'Imam Abdullah',
          date: '2025-11-20',
          time: '14:00',
          topic: 'Questions about Salah',
          status: 'confirmed',
        },
      ])
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

    setError('')
    setLoading(true)

    try {
      // TODO: API call to create booking and process payment
      // const response = await apiCall('book-consultation', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     scholarId: selectedScholar.id,
      //     userId: profile?.id,
      //     date: selectedDate,
      //     time: selectedTime,
      //     topic,
      //     fee: selectedScholar.consultationFee
      //   })
      // })

      setSuccess(true)
      setSelectedScholar(null)
      setSelectedDate('')
      setSelectedTime('')
      setTopic('')
      
      setTimeout(() => setSuccess(false), 5000)
      fetchMyBookings() // Refresh bookings

    } catch (err: any) {
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
    <div className="container mx-auto p-4 max-w-4xl">
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
                <p className="text-muted-foreground">
                  Your consultation has been booked. Check your email for confirmation details.
                </p>
              </div>
            ) : (
              <>
                {/* Scholar selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Scholar/Imam
                  </label>
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
                          <div>
                            <p className="font-semibold">{scholar.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {scholar.specialization}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">
                            ${scholar.consultationFee}/session
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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
                  {loading ? 'Processing...' : `Book & Pay $${selectedScholar?.consultationFee || 0}`}
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
    </div>
  )
}
