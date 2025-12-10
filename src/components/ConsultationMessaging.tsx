import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { Send, Clock, AlertCircle, Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'

interface Message {
  id: string
  booking_id: string
  sender_id: string
  message: string
  created_at: string
  sender?: {
    full_name: string
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
  }
  user: {
    full_name: string
  }
}

export const ConsultationMessaging: React.FC = () => {
  const { consultationId } = useParams<{ consultationId: string }>()
  const { profile } = useAuth()
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [extensionMinutes, setExtensionMinutes] = useState(15)
  const [showExtensionRequest, setShowExtensionRequest] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageSubscription = useRef<any>(null)
  const consultationSubscription = useRef<any>(null)

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
    if (!consultation || consultation.status === 'completed') {
      setIsActive(false)
      setTimeRemaining(null)
      return
    }

    if (!consultation.session_started_at || !consultation.session_ends_at) {
      setIsActive(false)
      setTimeRemaining(null)
      return
    }

    setIsActive(true)

    const updateTimer = () => {
      const now = new Date().getTime()
      const endTime = new Date(consultation.session_ends_at!).getTime()
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
      
      setTimeRemaining(remaining)

      if (remaining === 0) {
        handleSessionTimeout()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [consultation])

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
          scholar:profiles!scholar_id(full_name),
          user:profiles!user_id(full_name)
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
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching consultation:', err)
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for consultation:', consultationId)
      const { data, error } = await supabase
        .from('consultation_messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name)
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
    // Create unique channel name with user ID to avoid conflicts
    const channelName = `messages_${consultationId}_${profile?.id}_${Date.now()}`
    
    console.log('🔔 Subscribing to messages with channel:', channelName)
    
    messageSubscription.current = supabase
      .channel(channelName)
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
              sender:profiles!sender_id(full_name)
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
        }
      })
  }

  const subscribeToConsultationUpdates = () => {
    const channelName = `consultation_booking_${consultationId}_${Date.now()}`
    
    console.log('Subscribing to consultation updates with channel:', channelName)
    
    consultationSubscription.current = supabase
      .channel(channelName)
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
        }
      })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

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
          sender:profiles!sender_id(full_name)
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
      
      // Update booking to mark scholar as accepted
      const { error: updateError } = await supabase
        .from('consultation_bookings')
        .update({
          scholar_accepted: true,
          scholar_accepted_at: new Date().toISOString()
        })
        .eq('id', consultationId)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        throw updateError
      }

      console.log('✅ Consultation accepted, sending system message')
      
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
          sender:profiles!sender_id(full_name)
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

  const handleRequestTimeExtension = async () => {
    if (!extensionMinutes || extensionMinutes < 5) {
      alert('Please enter at least 5 minutes')
      return
    }

    try {
      // Calculate additional cost (assume same rate as original)
      const pricePerMinute = (consultation?.price || 0) / (consultation?.duration_minutes || 60)
      const additionalCost = pricePerMinute * extensionMinutes

      const { error } = await supabase.from('time_extension_requests').insert({
        consultation_id: consultationId,
        requested_by: profile?.id,
        additional_minutes: extensionMinutes,
        additional_cost: additionalCost,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min expiry
      })

      if (error) throw error

      // Send system message
      await supabase.from('consultation_messages').insert({
        booking_id: consultationId,
        sender_id: profile?.id,
        message: `Requesting ${extensionMinutes} more minutes ($${additionalCost.toFixed(2)})`
      })

      setShowExtensionRequest(false)
      alert('Time extension request sent!')
    } catch (err: any) {
      console.error('Error requesting extension:', err)
      alert('Failed to send request')
    }
  }

  // Function to approve time extension requests (called when user clicks approve button)
  // @ts-ignore - Function will be used when time extension UI is added
  const handleApproveExtension = async (requestId: string, additionalMinutes: number) => {
    try {
      // Update extension request
      await supabase
        .from('time_extension_requests')
        .update({ 
          status: 'approved',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)

      // Note: Time extension tracking would require additional schema columns
      // For now, we just approve the extension and update the transaction

      // Send system message
      await supabase.from('consultation_messages').insert({
        booking_id: consultationId,
        sender_id: profile?.id,
        message: `Time extension approved: +${additionalMinutes} minutes`
      })

      fetchConsultation()
    } catch (err: any) {
      console.error('Error approving extension:', err)
    }
  }

  const handleSessionTimeout = async () => {
    try {
      console.log('⏰ Session timeout - completing consultation...')
      
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
        } else {
          console.log('✅ Scholar set back online')
        }
      }

      const { error: msgError } = await supabase.from('consultation_messages').insert({
        booking_id: consultationId,
        sender_id: profile?.id,
        message: 'Consultation time has expired. Session closed automatically.'
      })

      if (msgError) {
        console.error('⚠️ Error sending timeout message:', msgError)
      }

      console.log('✅ Session ended successfully')
      fetchConsultation()
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

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Consultation: {consultation.topic}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                With {isScholar ? consultation.user.full_name : consultation.scholar.full_name}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(consultation.booking_date).toLocaleDateString()} at {consultation.booking_time}
              </p>
            </div>

            {/* Timer and Status */}
            <div className="text-right space-y-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                consultation.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                consultation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {consultation.status === 'confirmed' && isActive ? 'Active Session' : 
                 consultation.status === 'pending' && !consultation.scholar_accepted ? 'Awaiting Scholar' :
                 consultation.status === 'pending' && consultation.scholar_accepted ? 'Waiting to Start' :
                 consultation.status}
              </span>
              
              {isActive && timeRemaining !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div className="text-xl font-bold text-blue-600">
                      {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Time Left</div>
                </div>
              )}
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

            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && msg.sender && (
                    <p className="text-xs font-semibold mb-1 opacity-80">
                      {msg.sender.full_name}
                    </p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )
          })}
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
                onChange={(e) => setNewMessage(e.target.value)}
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
