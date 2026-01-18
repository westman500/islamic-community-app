import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase/client'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ArrowLeft, Bell, BellOff, CheckCheck, Trash2, RefreshCw, Megaphone, Calendar, MessageSquare, Heart, Video, Coins } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: Record<string, any> | null
  read: boolean
  created_at: string
}

export function NotificationsPanel() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (profile?.id) {
      fetchNotifications()
      
      // Subscribe to realtime notifications
      const subscription = supabase
        .channel('user-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${profile.id}`
          },
          (payload) => {
            console.log('New notification:', payload)
            setNotifications(prev => [payload.new as Notification, ...prev])
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [profile?.id])

  const fetchNotifications = async () => {
    if (!profile?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!profile?.id) return
    
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('read', false)
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
      
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'marketing':
      case 'campaign':
        return <Megaphone className="h-5 w-5 text-purple-500" />
      case 'consultation_booked':
      case 'consultation_completed':
        return <Calendar className="h-5 w-5 text-blue-500" />
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-500" />
      case 'donation':
        return <Heart className="h-5 w-5 text-red-500" />
      case 'livestream':
        return <Video className="h-5 w-5 text-orange-500" />
      case 'coin_reward':
        return <Coins className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    // Navigate based on notification type/data
    const data = notification.data
    if (data?.action_url) {
      navigate(data.action_url)
    } else if (notification.type === 'consultation_booked' || notification.type === 'consultation_completed') {
      navigate('/my-bookings')
    } else if (notification.type === 'livestream') {
      navigate('/livestreams')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-emerald-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-emerald-500"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-emerald-100">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-emerald-500"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-emerald-500 text-xs"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mb-4" />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BellOff className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No notifications yet</h3>
            <p className="text-sm text-gray-400 text-center mt-2">
              You'll receive notifications about consultations, campaigns, and more
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                !notification.read ? 'bg-emerald-50 border-emerald-200' : 'bg-white'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  !notification.read ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className={`text-sm font-medium truncate ${
                      !notification.read ? 'text-emerald-800' : 'text-gray-800'
                    }`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  {!notification.read && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                      New
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-500 h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNotification(notification.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
