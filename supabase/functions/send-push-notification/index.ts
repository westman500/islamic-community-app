// Edge function to send push notifications via FCM (Firebase Cloud Messaging) HTTP v1 API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
  campaignId?: string
  userId?: string
  userIds?: string[]
  title: string
  body: string
  data?: Record<string, any>
  targetAudience?: 'all' | 'new_users' | 'scholars' | 'active_users' | 'inactive_users'
}

// Create JWT for Firebase Admin SDK authentication
async function createJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  }
  
  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  const signInput = `${headerB64}.${payloadB64}`
  
  // Import private key and sign
  const privateKeyPem = serviceAccount.private_key
  const pemContents = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signInput)
  )
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${signInput}.${signatureB64}`
}

// Get OAuth2 access token using service account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createJWT(serviceAccount)
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })
  
  const data = await response.json()
  if (data.error) {
    throw new Error(`OAuth error: ${data.error_description || data.error}`)
  }
  
  return data.access_token
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Support both raw JSON and base64 encoded service account
    let fcmServiceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT')
    const fcmServiceAccountBase64 = Deno.env.get('FCM_SERVICE_ACCOUNT_BASE64')
    
    if (!fcmServiceAccountJson && fcmServiceAccountBase64) {
      try {
        fcmServiceAccountJson = atob(fcmServiceAccountBase64)
      } catch (e) {
        console.error('Failed to decode base64 service account:', e)
      }
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload: PushPayload = await req.json()
    
    const { campaignId, userId, userIds, title, body, data, targetAudience } = payload
    
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let tokens: string[] = []
    let recipients: { id: string; push_token: string }[] = []

    // Get recipients based on parameters
    if (userId) {
      // Single user
      const { data: user } = await supabase
        .from('profiles')
        .select('id, push_token')
        .eq('id', userId)
        .single()
      
      if (user?.push_token) {
        recipients.push(user)
        tokens.push(user.push_token)
      }
    } else if (userIds && userIds.length > 0) {
      // Multiple specific users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, push_token')
        .in('id', userIds)
        .not('push_token', 'is', null)
      
      if (users) {
        recipients = users.filter(u => u.push_token)
        tokens = recipients.map(u => u.push_token)
      }
    } else if (targetAudience || campaignId) {
      // Campaign or audience-based
      let query = supabase
        .from('profiles')
        .select('id, push_token')
        .not('push_token', 'is', null)
        .neq('push_token', '')
      
      if (targetAudience === 'new_users') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        query = query.gte('created_at', sevenDaysAgo.toISOString())
      } else if (targetAudience === 'scholars') {
        query = query.in('role', ['scholar', 'imam'])
      } else if (targetAudience === 'active_users') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('updated_at', thirtyDaysAgo.toISOString())
      } else if (targetAudience === 'inactive_users') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.lt('updated_at', thirtyDaysAgo.toISOString())
      }
      
      const { data: users } = await query
      if (users) {
        recipients = users.filter(u => u.push_token)
        tokens = recipients.map(u => u.push_token)
      }
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recipients with push tokens found',
          sent: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let failedCount = 0

    // Send via FCM HTTP v1 API if service account is configured
    if (fcmServiceAccountJson) {
      try {
        const serviceAccount = JSON.parse(fcmServiceAccountJson)
        const accessToken = await getAccessToken(serviceAccount)
        const projectId = serviceAccount.project_id
        
        // FCM HTTP v1 API - send one message per token
        for (const token of tokens) {
          try {
            const fcmResponse = await fetch(
              `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: {
                    token: token,
                    notification: {
                      title,
                      body
                    },
                    android: {
                      notification: {
                        icon: 'ic_notification',
                        click_action: 'FLUTTER_NOTIFICATION_CLICK',
                        channel_id: 'high_importance_channel'
                      }
                    },
                    apns: {
                      payload: {
                        aps: {
                          alert: { title, body },
                          sound: 'default',
                          badge: 1
                        }
                      }
                    },
                    data: {
                      ...Object.fromEntries(
                        Object.entries(data || {}).map(([k, v]) => [k, String(v)])
                      ),
                      campaign_id: campaignId || '',
                      type: 'marketing',
                      click_action: 'FLUTTER_NOTIFICATION_CLICK'
                    }
                  }
                })
              }
            )

            if (fcmResponse.ok) {
              successCount++
            } else {
              const errorData = await fcmResponse.json()
              console.error('FCM error for token:', token.substring(0, 20), errorData)
              failedCount++
            }
          } catch (tokenError) {
            console.error('Token send error:', tokenError)
            failedCount++
          }
        }
        
        console.log(`FCM result: ${successCount} success, ${failedCount} failed`)
      } catch (fcmError) {
        console.error('FCM service account error:', fcmError)
        failedCount = tokens.length
      }
    } else {
      // FCM not configured - just log and store notifications
      console.log('FCM_SERVICE_ACCOUNT not configured. Storing notifications locally only.')
      successCount = recipients.length
    }

    // Store notifications in database for each recipient
    const notifications = recipients.map(r => ({
      user_id: r.id,
      type: 'marketing',
      title,
      message: body,
      data: { campaign_id: campaignId, ...data },
      read: false
    }))

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }

    // Update campaign if provided
    if (campaignId) {
      await supabase
        .from('marketing_campaigns')
        .update({
          total_recipients: recipients.length,
          total_sent: successCount,
          sent_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', campaignId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: recipients.length,
        sent: successCount,
        failed: failedCount,
        message: fcmServiceAccountJson ? 'Push notifications sent via FCM HTTP v1 API' : 'Notifications stored (FCM not configured)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Push notification error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send notifications', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
