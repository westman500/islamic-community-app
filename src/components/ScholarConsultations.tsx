import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { supabase } from '../utils/supabase/client'
import { Calendar, Clock, User, MessageCircle, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import { MobileLayout } from './MobileLayout'
import ConsultationChat from './ConsultationChat'
import { Input } from './ui/input'

interface ConsultationBooking {
  id: string
  user_id: string
  scheduled_at: string
  topic: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  consultation_duration: number
  user: {
    full_name: string
  }
}

export const ScholarConsultations: React.FC = () => {
  const { profile } = useAuth()
  const { showNotification } = useNotification()
  const [consultations, setConsultations] = useState<ConsultationBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeChatBookingId, setActiveChatBookingId] = useState<string | null>(null)
  const [activeChatUser, setActiveChatUser] = useState<{ id: string; name: string; duration: number } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [consultationFee, setConsultationFee] = useState(1000)
  const [consultationDuration, setConsultationDuration] = useState(30)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConsultations()
    loadSettings()

    // Realtime subscription
    const channel = supabase
      .channel('scholar_consultations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultation_bookings',
          filter: `scholar_id=eq.${profile?.id}`
        },
        () => {
          fetchConsultations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id])

  const loadSettings = async () => {
    if (!profile?.id) return

    try {
      const { data } = await supabase
        .from('profiles')
        .select('consultation_fee, consultation_duration')
        .eq('id', profile.id)
        .single()

      if (data) {
        setConsultationFee(data.consultation_fee || 1000)
        setConsultationDuration(data.consultation_duration || 30)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const saveSettings = async () => {
    if (!profile?.id) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          consultation_fee: consultationFee,
          consultation_duration: consultationDuration
        })
        .eq('id', profile.id)

      if (error) throw error

      alert('Settings saved successfully!')
      setShowSettings(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const fetchConsultations = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('consultation_bookings')
        .select(`
          *,
          user:profiles!user_id(full_name)
        `)
        .eq('scholar_id', profile.id)
        .order('scheduled_at', { ascending: true })

      if (error) throw error

      setConsultations(data || [])
    } catch (error) {
      console.error('Error fetching consultations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <MobileLayout title="My Consultations">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading consultations...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="My Consultations">
      <div className="space-y-4">
        {/* Settings Button */}
        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="outline"
          className="w-full"
        >
          <Settings className="w-4 h-4 mr-2" />
          Consultation Settings
        </Button>

        {/* Settings Panel */}
        {showSettings && (
          <Card>
            <CardHeader>
              <CardTitle>Consultation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="fee" className="block text-sm font-medium mb-2">
                  Consultation Fee (Naira)
                </label>
                <Input
                  id="fee"
                  type="number"
                  min="100"
                  step="100"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(Number(e.target.value))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  = {Math.floor(consultationFee * 0.01)} Masjid Coins
                </p>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium mb-2">
                  Consultation Duration (minutes)
                </label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={consultationDuration}
                  onChange={(e) => setConsultationDuration(Number(e.target.value))}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consultations List */}
        {consultations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No consultations yet</p>
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
                      {booking.user.full_name}
                    </CardTitle>
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
                    <span>
                      {new Date(booking.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' '}({booking.consultation_duration} mins)
                    </span>
                  </div>
                  {booking.topic && (
                    <div className="text-sm">
                      <span className="font-semibold">Topic:</span> {booking.topic}
                    </div>
                  )}
                </div>

                {booking.status === 'confirmed' && (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      showNotification(
                        `Starting consultation with ${booking.user.full_name}. Duration: ${booking.consultation_duration} minutes.`,
                        'info'
                      )
                      setActiveChatBookingId(booking.id)
                      setActiveChatUser({
                        id: booking.user_id,
                        name: booking.user.full_name,
                        duration: booking.consultation_duration
                      })
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Start Consultation Chat
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Consultation Chat Modal */}
      {activeChatBookingId && activeChatUser && profile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] max-h-[90vh]">
            <ConsultationChat
              bookingId={activeChatBookingId}
              scholarId={profile.id}
              scholarName={profile.full_name || 'Scholar'}
              userId={activeChatUser.id}
              consultationDuration={activeChatUser.duration}
              onClose={() => {
                setActiveChatBookingId(null)
                setActiveChatUser(null)
              }}
            />
          </div>
        </div>
      )}
    </MobileLayout>
  )
}
