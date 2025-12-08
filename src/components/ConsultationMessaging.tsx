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
  consultation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'system' | 'time_extension_request' | 'time_extension_approved' | 'time_extension_denied'
  is_read: boolean
  created_at: string
  sender?: {
    full_name: string
  }
}

interface Consultation {
  id: string
  user_id: string
  scholar_id: string
  title: string
  price: number
  duration_minutes: number
  started_at: string | null
  actual_ended_at: string | null
  time_extended_minutes: number
  status: string
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

  useEffect(() => {
    if (consultationId) {
      fetchConsultation()
      fetchMessages()
      subscribeToMessages()
    }

    return () => {
      if (messageSubscription.current) {
        supabase.removeChannel(messageSubscription.current)
      }
    }
  }, [consultationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Timer countdown
  useEffect(() => {
    if (!consultation?.started_at || consultation.actual_ended_at || consultation.status === 'completed') {
      setIsActive(false)
      return
    }

    setIsActive(true)

    const interval = setInterval(() => {
      const startTime = new Date(consultation.started_at!).getTime()
      const totalMinutes = (consultation.duration_minutes || 60) + (consultation.time_extended_minutes || 0)
      const endTime = startTime + totalMinutes * 60 * 1000
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)

      setTimeRemaining(remaining)

      // Auto-close if time expired
      if (remaining === 0 && consultation.status !== 'completed') {
        handleSessionTimeout()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [consultation])

  const fetchConsultation = async () => {
    try {
      // First check if consultation booking has completed payment
      const { data: booking, error: bookingError } = await supabase
        .from('consultation_bookings')
        .select('payment_status, amount_paid')
        .eq('id', consultationId)
        .single()

      if (bookingError) throw bookingError

      // Block access if payment not completed
      if (booking.payment_status !== 'completed') {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          scholar:profiles!scholar_id(full_name),
          user:profiles!user_id(full_name)
        `)
        .eq('id', consultationId)
        .single()

      if (error) throw error

      setConsultation(data)
      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching consultation:', err)
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name)
        `)
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])

      // Mark messages as read
      const unreadMessages = data?.filter(m => !m.is_read && m.sender_id !== profile?.id)
      if (unreadMessages && unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id))
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err)
    }
  }

  const subscribeToMessages = () => {
    messageSubscription.current = supabase
      .channel(`consultation:${consultationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `consultation_id=eq.${consultationId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    try {
      const { error } = await supabase.from('messages').insert({
        consultation_id: consultationId,
        sender_id: profile?.id,
        content: newMessage.trim(),
        message_type: 'text'
      })

      if (error) throw error

      setNewMessage('')
      
      // Send notification to other party
      const recipientId = profile?.id === consultation?.user_id 
        ? consultation?.scholar_id 
        : consultation?.user_id

      await supabase.from('notifications').insert({
        user_id: recipientId,
        title: 'New Message',
        message: `New message in consultation: ${consultation?.title}`,
        notification_type: 'message_received',
        related_id: consultationId,
        action_url: `/consultation/${consultationId}/messages`
      })
    } catch (err: any) {
      console.error('Error sending message:', err)
    }
  }

  const handleStartSession = async () => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ 
          started_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('id', consultationId)

      if (error) throw error

      // Set scholar offline while session is active
      if (consultation?.scholar_id) {
        await supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('id', consultation.scholar_id)
      }

      // Send system message
      await supabase.from('messages').insert({
        consultation_id: consultationId,
        sender_id: profile?.id,
        content: 'Consultation session started',
        message_type: 'system'
      })

      fetchConsultation()
    } catch (err: any) {
      console.error('Error starting session:', err)
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
      await supabase.from('messages').insert({
        consultation_id: consultationId,
        sender_id: profile?.id,
        content: `Requesting ${extensionMinutes} more minutes ($${additionalCost.toFixed(2)})`,
        message_type: 'time_extension_request'
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

      // Update consultation time
      await supabase
        .from('consultations')
        .update({
          time_extended_minutes: (consultation?.time_extended_minutes || 0) + additionalMinutes
        })
        .eq('id', consultationId)

      // Send system message
      await supabase.from('messages').insert({
        consultation_id: consultationId,
        sender_id: profile?.id,
        content: `Time extension approved: +${additionalMinutes} minutes`,
        message_type: 'time_extension_approved'
      })

      fetchConsultation()
    } catch (err: any) {
      console.error('Error approving extension:', err)
    }
  }

  const handleSessionTimeout = async () => {
    try {
      await supabase
        .from('consultations')
        .update({ 
          actual_ended_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', consultationId)

      // Restore scholar availability after session ends
      if (consultation?.scholar_id) {
        await supabase
          .from('profiles')
          .update({ is_online: true })
          .eq('id', consultation.scholar_id)
      }

      await supabase.from('messages').insert({
        consultation_id: consultationId,
        sender_id: profile?.id,
        content: 'Consultation time has expired. Session closed automatically.',
        message_type: 'system'
      })

      fetchConsultation()
    } catch (err: any) {
      console.error('Error ending session:', err)
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
              <CardTitle>{consultation.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                With {isScholar ? consultation.user.full_name : consultation.scholar.full_name}
              </p>
            </div>

            {/* Timer */}
            {isActive && timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 5 * 60 * 1000 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <Clock className="w-5 h-5" />
                <span className="font-bold text-lg">{formatTime(timeRemaining)}</span>
              </div>
            )}

            {!consultation.started_at && consultation.status === 'confirmed' && isScholar && (
              <Button onClick={handleStartSession}>Start Session</Button>
            )}
          </div>

          {/* Time Extension Warning */}
          {isActive && timeRemaining && timeRemaining < 5 * 60 * 1000 && !showExtensionRequest && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <AlertCircle className="w-4 h-4" />
                <span>Less than 5 minutes remaining</span>
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowExtensionRequest(true)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1" />
                Request More Time
              </Button>
            </div>
          )}

          {/* Time Extension Request Form */}
          {showExtensionRequest && (
            <div className="mt-3 p-4 border rounded-lg bg-gray-50">
              <p className="text-sm font-semibold mb-3">Request Time Extension</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={extensionMinutes}
                  onChange={(e) => setExtensionMinutes(parseInt(e.target.value))}
                  placeholder="Minutes"
                  className="w-32"
                />
                <Button onClick={handleRequestTimeExtension} size="sm">
                  Send Request
                </Button>
                <Button 
                  onClick={() => setShowExtensionRequest(false)} 
                  variant="ghost" 
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === profile?.id
            const isSystemMessage = message.message_type !== 'text'

            if (isSystemMessage) {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {message.content}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {!isOwnMessage && message.sender && (
                    <p className="text-xs font-semibold mb-1 opacity-80">
                      {message.sender.full_name}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                    {new Date(message.created_at).toLocaleTimeString([], {
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
          {consultation.status === 'completed' || consultation.actual_ended_at ? (
            <div className="text-center text-gray-500 py-2">
              This consultation has ended
            </div>
          ) : !consultation.started_at ? (
            <div className="text-center text-gray-500 py-2">
              Consultation not started yet
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
