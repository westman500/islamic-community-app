import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { sendPushNotification } from '../utils/pushNotifications'
import { Send, Clock, AlertCircle, ArrowLeft } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'

interface Message {
  id: string
  booking_id: string
  sender_id: string
  message: string
  created_at: string
  sender?: {
    full_name: string
    avatar_url?: string
  }
}

interface Consultation {
  id: string
  user_id: string
  scholar_id: string
  topic: string
  amount_paid: number
  booking_date: string
  booking_time: string
  status: string
  payment_status: string
  created_at: string
  consultation_duration: number
  session_started_at: string | null
  session_ends_at: string | null
  scholar_accepted: boolean
  scholar_accepted_at: string | null
  scholar: {
    full_name: string
    avatar_url?: string
    is_online?: boolean
  }
  user: {
    full_name: string
    avatar_url?: string
  }
}

export const ConsultationMessaging: React.FC = () => {
  const { consultationId } = useParams<{ consultationId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [otherPersonTyping, setOtherPersonTyping] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageSubscription = useRef<any>(null)
  const consultationSubscription = useRef<any>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (consultationId) {
      console.log('Consultation ID:', consultationId)
      fetchConsultation()
      fetchMessages()
      subscribeToMessages()
      subscribeToConsultationUpdates()
    }

    return () => {
      console.log('Cleaning up subscriptions')
      if (messageSubscription.current) {
        supabase.removeChannel(messageSubscription.current)
      }
      if (consultationSubscription.current) {
        supabase.removeChannel(consultationSubscription.current)
      }
    }
  }, [consultationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Timer countdown for active sessions
  useEffect(() => {
    if (!consultation) {
      setIsActive(false)
      setTimeRemaining(null)
      return
    }

    if (consultation.status === 'completed') {
      setIsActive(false)
      setTimeRemaining(null)
      console.log('⏸️ Session completed, timer stopped')
      return
    }

    if (!consultation.session_started_at || !consultation.session_ends_at) {
      setIsActive(false)
      setTimeRemaining(null)
      console.log('⏸️ Session not started yet, no timer')
      return
    }

    setIsActive(true)
    console.log('⏱️ Timer activated - Session ends at:', consultation.session_ends_at)

    const updateTimer = () => {
      const now = new Date().getTime()
      const endTime = new Date(consultation.session_ends_at!).getTime()
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
      
      setTimeRemaining(remaining)
      console.log(`⏱️ Time remaining: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`)

      if (remaining === 0 && consultation.status !== 'completed') {
        console.log('⏰ TIME UP! Triggering session timeout')
        handleSessionTimeout()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => {
      console.log('🧹 Cleaning up timer')
      clearInterval(interval)
    }
  }, [consultation, consultation?.status, consultation?.session_started_at, consultation?.session_ends_at])

  const fetchConsultation = async () => {
    try {
      console.log('Fetching consultation:', consultationId)
      
      // First check if consultation booking has completed payment
      const { data: booking, error: bookingError } = await supabase
        .from('consultation_bookings')
        .select('payment_status, amount_paid')
        .eq('id', consultationId)
        .single()

      if (bookingError) {
        console.error('Error fetching booking payment status:', bookingError)
        throw bookingError
      }

      console.log('Payment status:', booking.payment_status)

      // Block access if payment not completed
      if (booking.payment_status !== 'completed') {
        console.warn('Payment not completed, blocking access')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('consultation_bookings')
        .select(`
          *,
          scholar:profiles!scholar_id(full_name, avatar_url, consultation_duration, is_online),
          user:profiles!user_id(full_name, avatar_url)
        `)
        .eq('id', consultationId)
        .single()

      if (error) {
        console.error('Error fetching consultation details:', error)
        throw error
      }

      console.log('Consultation data:', {
        status: data.status,
        scholarAccepted: data.scholar_accepted,
        sessionStarted: data.session_started_at,
        sessionEnds: data.session_ends_at
      })

      setConsultation(data)
      
      // Auto-start session if scholar accepted and session hasn't started yet
      if (data.scholar_accepted && !data.session_started_at && data.status === 'confirmed') {
        console.log('🚀 Auto-starting consultation session...')
        await autoStartSession(data)
      }
      
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching consultation:', err)
      setLoading(false)
    }
  }

  const autoStartSession = async (consultationData: any) => {
    try {
      const now = new Date()
      const duration = consultationData.consultation_duration || 30
      const endTime = new Date(now.getTime() + duration * 60 * 1000)

      console.log(`⏰ Auto-starting session: ${duration} minutes, ends at ${endTime.toLocaleTimeString()}`)

      // Update booking with session times
      const { error: updateError } = await supabase
        .from('consultation_bookings')
        .update({
          session_started_at: now.toISOString(),
          session_ends_at: endTime.toISOString(),
        })
        .eq('id', consultationId)

      if (updateError) {
        console.error('❌ Error auto-starting session:', updateError)
        return
      }

      console.log('✅ Session auto-started successfully')
      
      // Refresh consultation data to trigger timer
      fetchConsultation()
    } catch (error) {
      console.error('❌ Error in autoStartSession:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for consultation:', consultationId)
      const { data, error } = await supabase
        .from('consultation_messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name, avatar_url)
        `)
        .eq('booking_id', consultationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        throw error
      }

      console.log('Fetched messages:', data?.length || 0)
      setMessages(data || [])
    } catch (err: any) {
      console.error('Error fetching messages:', err)
    }
  }

  const subscribeToMessages = () => {
    // Remove any existing subscription first
    if (messageSubscription.current) {
      supabase.removeChannel(messageSubscription.current)
    }

    // Create unique channel name
    const channelName = `messages:${consultationId}`
    
    console.log('🔔 Subscribing to messages with channel:', channelName)
    
    messageSubscription.current = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: profile?.id }
        }
      })
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          if (payload.payload?.userId !== profile?.id) {
            setOtherPersonTyping(true)
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => setOtherPersonTyping(false), 3000)
          }
        }
      )
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          console.log('👤 Typing indicator received:', payload)
          if (payload.payload.userId !== profile?.id) {
            setOtherPersonTyping(true)
            // Clear any existing timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current)
            }
            // Hide typing indicator after 3 seconds
            typingTimeoutRef.current = setTimeout(() => {
              setOtherPersonTyping(false)
            }, 3000)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_messages',
          filter: `booking_id=eq.${consultationId}`
        },
        async (payload) => {
          console.log('📩 New message received via subscription:', payload)
          
          // Skip if this is our own message (already added optimistically)
          if (payload.new.sender_id === profile?.id) {
            console.log('⏭️ Skipping own message (already displayed)')
            return
          }
          
          // Fetch the full message with sender info
          const { data, error } = await supabase
            .from('consultation_messages')
            .select(`
              *,
              sender:profiles!sender_id(full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (error) {
            console.error('❌ Error fetching new message details:', error)
            return
          }
          
          if (data) {
            console.log('✅ Adding received message to chat:', data.message)
            setMessages((prev) => {
              // Prevent duplicate messages
              const exists = prev.find(m => m.id === data.id)
              if (exists) {
                console.log('⚠️ Message already exists, skipping')
                return prev
              }
              console.log('💬 Message added to state')
              return [...prev, data]
            })
            // Force scroll after state update
            setTimeout(() => scrollToBottom(), 100)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Message subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to messages!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Subscription error, retrying in 2s...')
          setTimeout(() => subscribeToMessages(), 2000)
        }
      })
  }

  const subscribeToConsultationUpdates = () => {
    // Remove any existing subscription first
    if (consultationSubscription.current) {
      supabase.removeChannel(consultationSubscription.current)
    }

    const channelName = `consultation:${consultationId}`
    
    console.log('Subscribing to consultation updates with channel:', channelName)
    
    consultationSubscription.current = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'consultation_bookings',
          filter: `id=eq.${consultationId}`
        },
        (payload) => {
          console.log('🔄 Consultation booking updated:', payload)
          console.log('📝 Updated fields:', payload.new)
          
          // Refresh consultation data and messages when booking is updated
          fetchConsultation()
          fetchMessages()
        }
      )
      .subscribe((status) => {
        console.log('📡 Consultation subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to consultation updates!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Consultation subscription error, retrying in 2s...')
          setTimeout(() => subscribeToConsultationUpdates(), 2000)
        }
      })
  }

  // Add polling as fallback for mobile where websockets might be unreliable
  useEffect(() => {
    if (!consultationId) return

    // Poll for new messages every 5 seconds as a fallback
    const pollInterval = setInterval(() => {
      fetchMessages()
      fetchConsultation() // Also poll consultation status for real-time updates
    }, 3000) // Poll every 3 seconds for faster updates

    return () => clearInterval(pollInterval)
  }, [consultationId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    // Clear typing indicator
    setOtherPersonTyping(false)

    try {
      console.log('Sending message:', newMessage.trim())
      
      // Insert message with immediate data return and sender info
      const { data, error } = await supabase
        .from('consultation_messages')
        .insert({
          booking_id: consultationId,
          sender_id: profile?.id,
          message: newMessage.trim()
        })
        .select(`
          *,
          sender:profiles!sender_id(full_name, avatar_url)
        `)
        .single()

      if (error) {
        console.error('Error inserting message:', error)
        throw error
      }

      console.log('Message sent successfully:', data)
      
      // Optimistically add message to UI immediately
      if (data) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === data.id)
          if (exists) return prev
          return [...prev, data]
        })
        scrollToBottom()
      }
      
      setNewMessage('')      
    } catch (err: any) {
      console.error('Error sending message:', err)
      alert('Failed to send message: ' + err.message)
    }
  }

  const handleAcceptConsultation = async () => {
    try {
      if (!consultation) return

      console.log('Accepting consultation:', consultationId)
      
      // Update booking to mark scholar as accepted AND set status to confirmed
      const { error: updateError } = await supabase
        .from('consultation_bookings')
        .update({
          scholar_accepted: true,
          scholar_accepted_at: new Date().toISOString(),
          status: 'confirmed'
        })
        .eq('id', consultationId)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        throw updateError
      }

      console.log('✅ Consultation accepted and confirmed, sending system message')
      
      // Send push notification to user
      try {
        await sendPushNotification(consultation.user_id, {
          title: 'Consultation Accepted!',
          body: `${consultation.scholar.full_name} has accepted your consultation request`,
          type: 'consultation',
          data: {
            consultationId: consultationId,
            scholarName: consultation.scholar.full_name
          }
        })
        console.log('✅ Push notification sent to user')
      } catch (notifError) {
        console.error('Failed to send push notification:', notifError)
        // Don't fail the whole operation if notification fails
      }
      
      // Send system message with .select() to get it back immediately
      const { data: newMsg, error: msgError } = await supabase
        .from('consultation_messages')
        .insert({
          booking_id: consultationId,
          sender_id: profile?.id,
          message: `${consultation.scholar.full_name} has accepted your consultation request. Waiting to start session...`
        })
        .select(`
          *,
          sender:profiles!sender_id(full_name, avatar_url)
        `)
        .single()

      if (msgError) {
        console.error('❌ Error sending acceptance message:', msgError)
      } else if (newMsg) {
        console.log('✅ Acceptance message sent, adding to chat')
        // Add message immediately to chat (optimistic update)
        setMessages((prev) => [...prev, newMsg])
        setTimeout(() => scrollToBottom(), 100)
      }

      console.log('🔄 Refreshing consultation data')
      fetchConsultation()
    } catch (err: any) {
      console.error('Error accepting consultation:', err)
      alert('Failed to accept consultation: ' + err.message)
    }
  }

  const handleStartSession = async () => {
    try {
      if (!consultation) return

      console.log('Starting session for consultation:', consultationId)

      const now = new Date()
      const duration = consultation.consultation_duration || 30
      const endTime = new Date(now.getTime() + duration * 60 * 1000)

      console.log('Session duration:', duration, 'minutes. End time:', endTime)

      // Update booking with session times and set status to confirmed
      const { error: updateError } = await supabase
        .from('consultation_bookings')
        .update({
          session_started_at: now.toISOString(),
          session_ends_at: endTime.toISOString(),
          status: 'confirmed'
        })
        .eq('id', consultationId)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        throw updateError
      }

      console.log('Booking updated with session times')

      // Set scholar offline while session is active
      if (consultation.scholar_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('id', consultation.scholar_id)

        if (profileError) {
          console.error('Error setting scholar offline:', profileError)
        }
      }

      // Send system message to notify member
      const { error: msgError } = await supabase.from('consultation_messages').insert({
        booking_id: consultationId,
        sender_id: profile?.id,
        message: `✅ ${consultation.scholar.full_name} has started the session. Session duration: ${duration} minutes.`
      })

      if (msgError) {
        console.error('Error sending session start message:', msgError)
      }

      console.log('Session started successfully, refreshing consultation')
      fetchConsultation()
    } catch (err: any) {
      console.error('Error starting session:', err)
      alert('Failed to start session: ' + err.message)
    }
  }

  // Time extension and formatting functions removed for now
  // Can be re-added when time extension feature is implemented
  
  // Handle input change and broadcast typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    
    // Broadcast typing indicator
    if (messageSubscription.current && e.target.value.trim()) {
      messageSubscription.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: profile?.id }
      })
    }
  }
  
  const handleSessionTimeout = async () => {
    // Prevent multiple timeout calls
    if (consultation?.status === 'completed') {
      console.log('⚠️ Session already completed, skipping timeout')
      return
    }

    try {
      console.log('⏰ Session timeout - completing consultation...')
      
      const { error: updateError } = await supabase
        .from('consultation_bookings')
        .update({ 
          status: 'completed'
        })
        .eq('id', consultationId)
        .eq('status', 'confirmed') // Only update if still confirmed

      if (updateError) {
        console.error('❌ Error updating booking status:', updateError)
        throw updateError
      }

      console.log('✅ Booking status updated to completed')

      // Restore scholar availability after session ends
      if (consultation?.scholar_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_online: true })
          .eq('id', consultation.scholar_id)

        if (profileError) {
          console.error('⚠️ Error setting scholar online:', profileError)
        } else {
          console.log('✅ Scholar set back online')
        }
      }

      const { error: msgError } = await supabase.from('consultation_messages').insert({
        booking_id: consultationId,
        sender_id: profile?.id,
        message: '⏰ Consultation time has expired. Session closed automatically.'
      })

      if (msgError) {
        console.error('⚠️ Error sending timeout message:', msgError)
      }

      console.log('✅ Session ended successfully')
      
      // Refresh consultation data to reflect completed status
      await fetchConsultation()
      
      // Show alert to user
      alert('⏰ Time is up! The consultation session has ended.')
      
    } catch (err: any) {
      console.error('❌ Error ending session:', err)
      alert('Failed to end session: ' + err.message)
    }
  }

  const handleManualEndSession = async () => {
    if (!confirm('Are you sure you want to end this consultation session?')) {
      return
    }

    try {
      console.log('🛑 Manually ending session...')
      
      const { error: updateError } = await supabase
        .from('consultation_bookings')
        .update({ 
          status: 'completed'
        })
        .eq('id', consultationId)

      if (updateError) {
        console.error('❌ Error updating booking status:', updateError)
        throw updateError
      }

      console.log('✅ Booking status updated to completed')

      // Restore scholar availability after session ends
      if (consultation?.scholar_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_online: true })
          .eq('id', consultation.scholar_id)

        if (profileError) {
          console.error('⚠️ Error setting scholar online:', profileError)
        }
      }

      const { error: msgError } = await supabase.from('consultation_messages').insert({
        booking_id: consultationId,
        sender_id: profile?.id,
        message: `Session ended by ${profile?.full_name}.`
      })

      if (msgError) {
        console.error('⚠️ Error sending end message:', msgError)
      }

      console.log('✅ Session ended successfully')
      fetchConsultation()
    } catch (err: any) {
      console.error('❌ Error ending session:', err)
      alert('Failed to end session: ' + err.message)
    }
  }

  const isScholar = profile?.id === consultation?.scholar_id

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p>Loading consultation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 font-semibold mb-2">Access Denied</p>
            <p className="text-sm text-gray-600">
              Payment for this consultation has not been completed.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Please complete the payment to access the consultation messaging.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="h-[calc(100vh-8rem)] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(isScholar ? '/manage-consultations' : '/my-bookings')}
              className="mt-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {/* Scholar/User Profile Picture */}
            {!isScholar && consultation.scholar?.avatar_url && (
              <div className="relative flex-shrink-0">
                <img 
                  src={consultation.scholar.avatar_url} 
                  alt={consultation.scholar.full_name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
                {consultation.scholar.is_online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
            )}
            
            {isScholar && consultation.user?.avatar_url && (
              <div className="flex-shrink-0">
                <img 
                  src={consultation.user.avatar_url} 
                  alt={consultation.user.full_name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Consultation: {consultation.topic}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-600">
                      With {isScholar ? consultation.user.full_name : consultation.scholar.full_name}
                    </p>
                    {!isScholar && consultation.scholar?.is_online && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        🟢 Online
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(consultation.booking_date).toLocaleDateString()} at {consultation.booking_time}
                    {!isScholar && consultation.consultation_duration && !isActive && (
                      <span className="ml-2">• {consultation.consultation_duration} min session</span>
                    )}
                  </p>
                </div>

                {/* Timer and Status */}
                <div className="text-right space-y-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    consultation.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                    consultation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    consultation.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {consultation.status === 'confirmed' && isActive ? '🟢 Active Session' : 
                     consultation.status === 'pending' && !consultation.scholar_accepted ? '⏳ Awaiting Scholar' :
                     consultation.status === 'pending' && consultation.scholar_accepted ? '⏳ Waiting to Start' :
                     consultation.status === 'completed' ? '✅ Completed' :
                     consultation.status}
                  </span>
                  
                  {isActive && timeRemaining !== null && (
                    <div className={`border rounded-md px-2 py-1.5 ${
                      timeRemaining <= 300 ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${
                          timeRemaining <= 300 ? 'text-red-600' : 'text-blue-600'
                        }`} />
                        <div className={`text-sm font-bold ${
                          timeRemaining <= 300 ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                        </div>
                        <span className={`text-[10px] font-medium ${
                          timeRemaining <= 300 ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {timeRemaining <= 300 ? '⚠️' : 'left'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scholar Acceptance and Session Start Buttons */}
          {isScholar && consultation.status === 'pending' && (
            <div className="mt-4 space-y-2">
              {!consultation.scholar_accepted ? (
                <Button onClick={handleAcceptConsultation} className="w-full bg-green-600 hover:bg-green-700">
                  ✓ Accept Consultation Request
                </Button>
              ) : (
                <Button onClick={handleStartSession} className="w-full bg-blue-600 hover:bg-blue-700">
                  🚀 Start Session
                </Button>
              )}
            </div>
          )}

          {/* End Session Button for Scholar during active session */}
          {isScholar && consultation.status === 'confirmed' && isActive && (
            <div className="mt-4">
              <Button onClick={handleManualEndSession} className="w-full bg-red-600 hover:bg-red-700">
                🛑 End Session
              </Button>
            </div>
          )}

          {/* Member waiting message */}
          {!isScholar && consultation.status === 'pending' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                {!consultation.scholar_accepted ? (
                  <>⏳ Waiting for {consultation.scholar.full_name} to accept your consultation request...</>
                ) : (
                  <>⏳ {consultation.scholar.full_name} has accepted. Waiting for them to start the session...</>
                )}
              </p>
            </div>
          )}
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isOwnMessage = msg.sender_id === profile?.id
            const senderAvatar = msg.sender?.avatar_url

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                {!isOwnMessage && (
                  <div className="flex-shrink-0">
                    {senderAvatar ? (
                      <img 
                        src={senderAvatar} 
                        alt={msg.sender?.full_name || 'User'} 
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-[11px] font-semibold">
                        {msg.sender?.full_name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-2.5 ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && msg.sender && (
                    <p className="text-[11px] font-semibold mb-0.5 opacity-80">
                      {msg.sender.full_name}
                    </p>
                  )}
                  <p className="text-[13px]">{msg.message}</p>
                  <p className={`text-[10px] mt-0.5 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {isOwnMessage && (
                  <div className="flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile?.full_name || 'You'} 
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] font-semibold">
                        {profile?.full_name?.charAt(0) || 'Y'}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )
          })}
          {otherPersonTyping && (
            <div className="flex justify-start">
              <div className="max-w-[70%] rounded-lg p-3 bg-gray-100">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span>typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4">
          {consultation.status === 'completed' ? (
            <div className="text-center text-gray-500 py-2">
              This consultation has ended
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}
