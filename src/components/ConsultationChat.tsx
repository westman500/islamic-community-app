import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Send, Clock, AlertCircle, RefreshCw } from 'lucide-react'

interface Message {
  id: string
  booking_id: string
  sender_id: string
  message: string
  created_at: string
  sender_name: string
}

interface ConsultationChatProps {
  bookingId: string
  scholarId: string
  scholarName: string
  userId: string
  consultationDuration: number // in minutes
  onClose: () => void
}

export default function ConsultationChat({ 
  bookingId, 
  scholarId, 
  scholarName,
  consultationDuration,
  onClose 
}: ConsultationChatProps) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(consultationDuration * 60) // convert to seconds
  const [isActive, setIsActive] = useState(true)
  const [isExtending, setIsExtending] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)

  const isScholar = profile?.role === 'scholar' || profile?.role === 'imam'

  // Initialize timer based on when consultation actually started
  useEffect(() => {
    const initializeTimer = async () => {
      try {
        console.log('🔍 Fetching booking data for timer initialization...', { bookingId, consultationDuration })
        
        const { data, error } = await supabase
          .from('consultation_bookings')
          .select('started_at, consultation_duration')
          .eq('id', bookingId)
          .single()

        if (error) {
          console.error('❌ Error fetching booking:', error)
          // Fallback to prop value if database query fails
          console.log('⚠️ Using fallback timer with consultationDuration prop:', consultationDuration)
          setTimeRemaining(consultationDuration * 60)
          setIsInitialized(true)
          return
        }

        console.log('✅ Booking data fetched:', data)

        // Use consultation_duration from database, fallback to prop
        const duration = data.consultation_duration || consultationDuration
        console.log('⏱️ Consultation duration:', duration, 'minutes')

        if (data.started_at) {
          // Calculate elapsed time since consultation started
          const startTime = new Date(data.started_at).getTime()
          const now = new Date().getTime()
          const elapsedSeconds = Math.floor((now - startTime) / 1000)
          const totalSeconds = duration * 60
          const remaining = Math.max(0, totalSeconds - elapsedSeconds)

          console.log(`⏰ Timer initialized from started_at:`)
          console.log(`  - Start time: ${new Date(data.started_at).toLocaleString()}`)
          console.log(`  - Elapsed: ${elapsedSeconds}s (${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s)`)
          console.log(`  - Total: ${totalSeconds}s (${duration}m)`)
          console.log(`  - Remaining: ${remaining}s (${Math.floor(remaining / 60)}m ${remaining % 60}s)`)
          
          setTimeRemaining(remaining)
          
          if (remaining <= 0) {
            console.log('⏰ Timer expired')
            setIsActive(false)
          }
        } else {
          // First time opening chat - set started_at timestamp
          console.log('⏰ First time opening chat - setting started_at timestamp')
          const now = new Date().toISOString()
          
          const { error: updateError } = await supabase
            .from('consultation_bookings')
            .update({ started_at: now })
            .eq('id', bookingId)

          if (updateError) {
            console.error('❌ Error setting started_at:', updateError)
          } else {
            console.log('✅ started_at set to:', now)
          }
          
          // Set full duration for new consultation
          const totalSeconds = duration * 60
          console.log(`⏰ Starting new timer: ${totalSeconds}s (${duration}m)`)
          setTimeRemaining(totalSeconds)
        }
        
        setIsInitialized(true)
        console.log('✅ Timer initialization complete')
      } catch (error) {
        console.error('❌ Fatal error initializing timer:', error)
        // Ensure timer still works with fallback
        setTimeRemaining(consultationDuration * 60)
        setIsInitialized(true)
      }
    }

    initializeTimer()
  }, [bookingId, consultationDuration])

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Timer countdown
  useEffect(() => {
    if (!isInitialized || !isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    console.log('⏰ Starting countdown interval')
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newValue = prev - 1
        
        // Log every 30 seconds for debugging
        if (newValue % 30 === 0) {
          console.log(`⏰ Timer tick: ${Math.floor(newValue / 60)}:${(newValue % 60).toString().padStart(2, '0')}`)
        }
        
        if (newValue <= 0) {
          console.log('⏰ Timer reached 0 - expiring consultation')
          setIsActive(false)
          handleTimeExpired()
          return 0
        }
        
        return newValue
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        console.log('⏰ Cleaning up countdown interval')
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isInitialized, isActive])

  // Handle time expiration
  const handleTimeExpired = async () => {
    try {
      await supabase
        .from('consultation_bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)
    } catch (error) {
      console.error('Error updating booking status:', error)
    }
  }

  // Load messages
  useEffect(() => {
    loadMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`consultation_chat_${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => [...prev, newMsg])
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId])

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('consultation_messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedMessages = data?.map(msg => ({
        ...msg,
        sender_name: msg.sender?.full_name || 'Unknown'
      })) || []

      setMessages(formattedMessages)
      scrollToBottom()
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !isActive) return

    try {
      const { error } = await supabase
        .from('consultation_messages')
        .insert({
          booking_id: bookingId,
          sender_id: profile?.id,
          message: newMessage.trim()
        })

      if (error) throw error

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    }
  }

  const handleExtendConsultation = async () => {
    if (isExtending) return

    const EXTENSION_DURATION = 15 // 15 minutes
    const EXTENSION_COST = 5 // 5 Masjid Coins

    const currentBalance = profile?.masjid_coin_balance || 0

    if (currentBalance < EXTENSION_COST) {
      alert(`Insufficient balance. You need ${EXTENSION_COST} coins to extend consultation by ${EXTENSION_DURATION} minutes.`)
      return
    }

    if (!confirm(`Extend consultation by ${EXTENSION_DURATION} minutes for ${EXTENSION_COST} coins?`)) {
      return
    }

    setIsExtending(true)

    try {
      // Deduct coins from user
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ masjid_coin_balance: currentBalance - EXTENSION_COST })
        .eq('id', profile?.id)

      if (deductError) throw new Error('Failed to deduct coins')

      // Note: Scholar balance will be automatically updated by database trigger
      console.log(`💰 Scholar will be credited ${EXTENSION_COST} coins via database trigger`)

      // Create transaction records
      const paymentRef = `EXT-${Date.now()}`

      await supabase
        .from('masjid_coin_transactions')
        .insert([
          {
            user_id: profile?.id,
            recipient_id: scholarId,
            amount: -EXTENSION_COST,
            type: 'consultation_extension',
            description: `Extended consultation with ${scholarName}`,
            payment_reference: paymentRef,
            payment_status: 'completed',
            status: 'completed'
          },
          {
            user_id: scholarId,
            recipient_id: scholarId,
            amount: EXTENSION_COST,
            type: 'consultation_extension',
            description: `Extension fee from ${profile?.full_name}`,
            payment_reference: paymentRef,
            payment_status: 'completed',
            status: 'completed'
          }
        ])

      // Extend time
      setTimeRemaining(prev => prev + (EXTENSION_DURATION * 60))
      setIsActive(true)

      alert(`Consultation extended by ${EXTENSION_DURATION} minutes!`)
    } catch (error) {
      console.error('Error extending consultation:', error)
      alert('Failed to extend consultation')
    } finally {
      setIsExtending(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Consultation Chat</CardTitle>
            <CardDescription>
              {isScholar ? `Consulting with member` : `Consulting with ${scholarName}`}
            </CardDescription>
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        </div>
        
        {/* Timer Display */}
        <div className={`mt-4 p-3 rounded-lg flex items-center justify-between ${
          timeRemaining < 300 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${timeRemaining < 300 ? 'text-red-600' : 'text-green-600'}`} />
            {!isInitialized ? (
              <span className="text-sm text-gray-600">Loading timer...</span>
            ) : (
              <>
                <span className={`font-mono text-lg font-bold ${
                  timeRemaining < 300 ? 'text-red-700' : 'text-green-700'
                }`}>
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-sm text-gray-600">remaining</span>
              </>
            )}
          </div>
          
          {!isScholar && !isActive && (
            <Button 
              onClick={handleExtendConsultation}
              disabled={isExtending}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Extend (5 coins)
            </Button>
          )}
        </div>

        {!isActive && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800">
              {isScholar 
                ? 'Consultation time has expired. Waiting for member to extend or close.'
                : 'Consultation time has expired. You can extend for 15 more minutes using 5 Masjid Coins.'
              }
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === profile?.id
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    <div className={`rounded-lg px-4 py-2 ${
                      isOwn 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {!isOwn && (
                        <div className="text-xs font-semibold mb-1 opacity-75">
                          {msg.sender_name}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          {isActive ? (
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-2">
              Chat is disabled - consultation time has expired
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
