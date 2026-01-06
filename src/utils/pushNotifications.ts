/**
 * Push Notifications Service
 * Handles Android push notifications with Masjid logo
 */

import { supabase } from './supabase/client'

// Capacitor plugins will be lazy-loaded to avoid errors in web builds
let PushNotifications: any = null
let LocalNotifications: any = null

// Initialize Capacitor plugins if on native platform
const initializePlugins = async () => {
  try {
    // Check if Capacitor exists and is native platform
    const Capacitor = (window as any).Capacitor
    if (Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform()) {
      const pushModule = await import('@capacitor/push-notifications')
      const localModule = await import('@capacitor/local-notifications')
      PushNotifications = pushModule.PushNotifications
      LocalNotifications = localModule.LocalNotifications
      return true
    }
  } catch (error) {
    console.warn('Capacitor plugins not available:', error)
  }
  return false
}

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, any>
  type?: 'reel_upload' | 'reel_trending' | 'coin_reward' | 'consultation' | 'livestream' | 'donation' | 'general'
  icon?: string
  largeIcon?: string
  smallIcon?: string
}

/**
 * Initialize push notifications for Android
 */
export const initPushNotifications = async () => {
  const isNative = await initializePlugins()
  
  if (!isNative || !PushNotifications) {
    console.log('Push notifications not available on this platform')
    return
  }

  try {
    // Request permission
    const permResult = await PushNotifications.requestPermissions()
    
    if (permResult.receive === 'granted') {
      // Register with FCM
      await PushNotifications.register()
      
      console.log('✅ Push notifications initialized')
      
      // Listen for registration token
      await PushNotifications.addListener('registration', async (token: any) => {
        console.log('📱 Push registration success, token: ' + token.value)
        
        // Save token to database for this user
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ push_token: token.value })
            .eq('id', user.id)
        }
      })

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ Push registration error:', error)
      })

      // Listen for push notifications received
      await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('📩 Push notification received:', notification)
        
        // Show local notification with custom styling
        showLocalNotification({
          title: notification.title || 'Masjid App',
          body: notification.body || '',
          data: notification.data,
          type: notification.data?.type
        })
      })

      // Listen for push notification actions
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        console.log('🔔 Push notification action performed:', notification)
        
        // Handle navigation based on notification type
        handleNotificationAction(notification.notification.data)
      })
      
    } else {
      console.warn('Push notification permission denied')
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error)
  }
}

/**
 * Show local notification with Masjid logo
 */
export const showLocalNotification = async (payload: NotificationPayload) => {
  const isNative = await initializePlugins()
  
  if (!isNative || !LocalNotifications) {
    console.log('Local notifications not available, showing toast instead')
    return
  }

  try {
    const notificationId = Date.now()
    
    await LocalNotifications.schedule({
      notifications: [
        {
          title: payload.title,
          body: payload.body,
          id: notificationId,
          schedule: { at: new Date(Date.now() + 100) }, // Show immediately
          sound: 'default',
          attachments: payload.largeIcon ? [{ id: 'icon', url: payload.largeIcon }] : undefined,
          actionTypeId: payload.type || 'general',
          extra: payload.data || {}
        }
      ]
    })

    console.log('📱 Local notification scheduled:', payload.title)
  } catch (error) {
    console.error('Error showing local notification:', error)
  }
}

/**
 * Send push notification via Supabase Edge Function
 */
export const sendPushNotification = async (
  userId: string,
  payload: NotificationPayload
) => {
  try {
    // Get user's push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single()

    if (!profile?.push_token) {
      console.log('No push token for user:', userId)
      return
    }

    // Call edge function to send push notification
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        token: profile.push_token,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/app-icon.png', // Masjid logo
          data: {
            ...payload.data,
            type: payload.type
          }
        }
      }
    })

    if (error) throw error
    
    console.log('✅ Push notification sent:', data)
    return data
  } catch (error) {
    console.error('Error sending push notification:', error)
    throw error
  }
}

/**
 * Handle notification tap/click actions
 */
const handleNotificationAction = (data: any) => {
  const type = data?.type
  const id = data?.id
  
  switch (type) {
    case 'reel_upload':
    case 'reel_trending':
      // Navigate to specific reel
      if (id) {
        window.location.href = `/reels/${id}`
      } else {
        window.location.href = '/reels'
      }
      break
      
    case 'coin_reward':
      // Navigate to wallet
      window.location.href = '/coin'
      break
      
    case 'consultation':
      // Navigate to consultation
      if (id) {
        window.location.href = `/consultations/${id}`
      } else {
        window.location.href = '/my-bookings'
      }
      break
      
    case 'livestream':
      // Navigate to livestream
      if (id) {
        window.location.href = `/livestream/${id}`
      } else {
        window.location.href = '/livestream'
      }
      break
      
    case 'donation':
      // Navigate to scholar wallet or donation page
      window.location.href = '/scholar-wallet'
      break
      
    default:
      // Navigate to dashboard
      window.location.href = '/dashboard'
      break
  }
}

/**
 * Notify user about reel upload
 */
export const notifyReelUploaded = async (uploaderName: string, reelTitle: string) => {
  await showLocalNotification({
    title: '🎥 New Reel Uploaded!',
    body: `${uploaderName} just uploaded: "${reelTitle}"`,
    type: 'reel_upload',
    data: { uploaderName, reelTitle }
  })
}

/**
 * Notify user about trending reel
 */
export const notifyReelTrending = async (reelTitle: string, views: number) => {
  await showLocalNotification({
    title: '🔥 Your Reel is Trending!',
    body: `"${reelTitle}" has reached ${views.toLocaleString()} views!`,
    type: 'reel_trending',
    data: { reelTitle, views }
  })
}

/**
 * Notify user about coin reward
 */
export const notifyCoinReward = async (coins: number, reason: string) => {
  await showLocalNotification({
    title: '🎁 Coins Earned!',
    body: `You earned ${coins} coins! ${reason}`,
    type: 'coin_reward',
    data: { coins, reason }
  })
}

/**
 * Notify about consultation booking
 */
export const notifyConsultationBooked = async (scholarName: string, duration: number) => {
  await showLocalNotification({
    title: '📅 Consultation Booked',
    body: `Your ${duration}-minute consultation with ${scholarName} is confirmed!`,
    type: 'consultation',
    data: { scholarName, duration }
  })
}

/**
 * Notify about livestream starting - broadcasts to ALL members
 */
export const notifyLivestreamStarting = async (scholarName: string, title: string) => {
  try {
    // Broadcast to all members via database
    const { data: members } = await supabase
      .from('profiles')
      .select('id, push_token')
      .eq('role', 'user')
      .not('push_token', 'is', null)
    
    if (members && members.length > 0) {
      console.log(`📢 Broadcasting livestream notification to ${members.length} members`)
      
      // Send to all members with push tokens
      for (const member of members) {
        if (member.push_token) {
          await sendPushNotification(member.id, {
            title: '🎥 Livestream Starting!',
            body: `${scholarName} is going live: "${title}"`,
            type: 'livestream',
            data: { scholarName, title }
          }).catch(err => console.error('Failed to send to member:', err))
        }
      }
    }
    
    // Also show local notification for current user
    await showLocalNotification({
      title: '🎥 Livestream Starting!',
      body: `${scholarName} is going live: "${title}"`,
      type: 'livestream',
      data: { scholarName, title }
    })
  } catch (error) {
    console.error('Error broadcasting livestream notification:', error)
  }
}

/**
 * Notify all members when scholar becomes available for consultation
 */
export const notifyScholarAvailable = async (
  scholarId: string,
  scholarName: string,
  yearsOfExperience: number = 0,
  specializations: string[] = []
) => {
  try {
    // Generate dynamic description based on scholar's profile
    const descriptions = [
      `Experienced Islamic scholar with ${yearsOfExperience} years providing spiritual guidance and consultation.`,
      `Knowledgeable imam offering ${yearsOfExperience}+ years of Islamic counseling and support.`,
      `Dedicated scholar specializing in ${specializations.join(', ')} - ${yearsOfExperience} years experience.`,
      `Expert in Islamic studies with ${yearsOfExperience} years of experience helping the community.`,
      `Trusted scholar providing consultation on ${specializations.length > 0 ? specializations.join(', ') : 'Islamic matters'}.`
    ]
    
    // Pick a random description or use the first one
    const description = yearsOfExperience > 0 
      ? descriptions[Math.floor(Math.random() * descriptions.length)]
      : `Islamic scholar now available for consultation and spiritual guidance.`
    
    // Broadcast to all members
    const { data: members } = await supabase
      .from('profiles')
      .select('id, push_token')
      .eq('role', 'user')
      .not('push_token', 'is', null)
    
    if (members && members.length > 0) {
      console.log(`📢 Broadcasting scholar available notification to ${members.length} members`)
      
      for (const member of members) {
        if (member.push_token) {
          await sendPushNotification(member.id, {
            title: '📚 Scholar Available!',
            body: `${scholarName} is now available. ${description}`,
            type: 'scholar_online',
            data: { scholarId, scholarName, description }
          }).catch(err => console.error('Failed to send to member:', err))
        }
      }
    }
    
    // Show local notification
    await showLocalNotification({
      title: '📚 Scholar Available!',
      body: `${scholarName} is now available. ${description}`,
      type: 'scholar_online',
      data: { scholarId, scholarName, description }
    })
  } catch (error) {
    console.error('Error broadcasting scholar available notification:', error)
  }
}

/**
 * Notify about donation received
 */
export const notifyDonationReceived = async (donorName: string, amount: number) => {
  await showLocalNotification({
    title: '❤️ Donation Received',
    body: `${donorName} donated ₦${amount.toFixed(2)}. Jazakallah khair!`,
    type: 'donation',
    data: { donorName, amount }
  })
}

/**
 * Notify scholar when a consultation is booked by a member
 */
export const notifyScholarConsultationBooked = async (
  scholarId: string,
  memberName: string,
  topic: string,
  amount: number
) => {
  try {
    // Send push notification to scholar
    await sendPushNotification(scholarId, {
      title: '📅 New Consultation Booked!',
      body: `${memberName} booked a consultation: "${topic}" (₦${amount})`,
      type: 'consultation',
      data: { memberName, topic, amount }
    })
    
    // Also show local notification if scholar is on the app
    await showLocalNotification({
      title: '📅 New Consultation Booked!',
      body: `${memberName} booked a consultation: "${topic}"`,
      type: 'consultation',
      data: { memberName, topic, amount }
    })
  } catch (error) {
    console.error('Error notifying scholar of consultation:', error)
  }
}

/**
 * Notify scholar when zakat/donation is received
 */
export const notifyScholarDonationReceived = async (
  scholarId: string,
  donorName: string,
  amount: number
) => {
  try {
    await sendPushNotification(scholarId, {
      title: '💰 Zakat Received!',
      body: `${donorName} sent you ₦${amount.toFixed(2)} in zakat. Barakallahu feekum!`,
      type: 'donation',
      data: { donorName, amount }
    })
    
    await showLocalNotification({
      title: '💰 Zakat Received!',
      body: `${donorName} sent you ₦${amount.toFixed(2)} in zakat. Barakallahu feekum!`,
      type: 'donation',
      data: { donorName, amount }
    })
  } catch (error) {
    console.error('Error notifying scholar of donation:', error)
  }
}

/**
 * Notify user when transaction is completed
 */
export const notifyTransactionCompleted = async (
  userId: string,
  transactionType: string,
  amount: number,
  description: string
) => {
  try {
    const isDebit = amount < 0
    const absAmount = Math.abs(amount)
    
    await sendPushNotification(userId, {
      title: isDebit ? '💸 Transaction Completed' : '💰 Coins Received',
      body: `${description} - ${isDebit ? '-' : '+'}${absAmount} coins`,
      type: 'general',
      data: { transactionType, amount, description }
    })
    
    await showLocalNotification({
      title: isDebit ? '💸 Transaction Completed' : '💰 Coins Received',
      body: `${description} - ${isDebit ? '-' : '+'}${absAmount} coins`,
      type: 'general',
      data: { transactionType, amount, description }
    })
  } catch (error) {
    console.error('Error notifying transaction:', error)
  }
}

/**
 * Notify member when consultation is completed
 */
export const notifyConsultationCompleted = async (
  userId: string,
  scholarName: string
) => {
  try {
    await sendPushNotification(userId, {
      title: '✅ Consultation Completed',
      body: `Your consultation with ${scholarName} has ended. Please leave a review!`,
      type: 'consultation',
      data: { scholarName }
    })
    
    await showLocalNotification({
      title: '✅ Consultation Completed',
      body: `Your consultation with ${scholarName} has ended. Please leave a review!`,
      type: 'consultation',
      data: { scholarName }
    })
  } catch (error) {
    console.error('Error notifying consultation completion:', error)
  }
}

/**
 * Notify scholar when consultation is completed
 */
export const notifyScholarConsultationCompleted = async (
  scholarId: string,
  memberName: string
) => {
  try {
    await sendPushNotification(scholarId, {
      title: '✅ Consultation Completed',
      body: `Consultation with ${memberName} has ended successfully.`,
      type: 'consultation',
      data: { memberName }
    })
    
    await showLocalNotification({
      title: '✅ Consultation Completed',
      body: `Consultation with ${memberName} has ended successfully.`,
      type: 'consultation',
      data: { memberName }
    })
  } catch (error) {
    console.error('Error notifying scholar of completion:', error)
  }
}
