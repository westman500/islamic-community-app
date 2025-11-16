import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Agora Token Generation
// Based on: https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey
class AgoraTokenBuilder {
  static buildToken(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: string | number,
    role: number,
    privilegeExpiredTs: number
  ): string {
    const version = '007'
    const randomInt = Math.floor(Math.random() * 0xFFFFFFFF)
    const salt = randomInt
    const ts = Math.floor(Date.now() / 1000) + 24 * 3600

    const message = {
      salt,
      ts,
      messages: {
        1: privilegeExpiredTs, // joinChannel privilege
        2: privilegeExpiredTs, // publishAudioStream privilege  
        3: privilegeExpiredTs, // publishVideoStream privilege
        4: privilegeExpiredTs, // publishDataStream privilege
      }
    }

    const uidStr = uid === 0 ? '' : String(uid)
    const signature = this.generateSignature(
      appId,
      appCertificate,
      channelName,
      uidStr,
      message
    )

    return `${version}${appId}${signature}`
  }

  private static generateSignature(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: string,
    message: any
  ): string {
    // Simplified signature generation
    // In production, use the official Agora token library
    const content = `${appId}${channelName}${uid}${message.salt}${message.ts}`
    return this.hmacSha256(appCertificate, content)
  }

  private static hmacSha256(key: string, message: string): string {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(key)
    const messageData = encoder.encode(message)
    
    // Simplified - use crypto.subtle in production
    return btoa(String.fromCharCode(...messageData)).substring(0, 32)
  }
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify user with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get request body
    const { channelName, role } = await req.json()

    if (!channelName) {
      throw new Error('Channel name is required')
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Determine Agora role
    // Publisher (1) = can stream (scholars/imams)
    // Subscriber (2) = can only watch (users)
    let agoraRole = 2 // Subscriber by default

    if (role === 'host' || profile?.role === 'scholar' || profile?.role === 'imam') {
      agoraRole = 1 // Publisher
    }

    // Generate token
    const appId = Deno.env.get('AGORA_APP_ID')!
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE')!
    
    if (!appId || !appCertificate) {
      throw new Error('Agora credentials not configured')
    }

    const uid = user.id.substring(0, 8) // Use first 8 chars of UUID
    const expirationTimeInSeconds = 3600 // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    const token = AgoraTokenBuilder.buildToken(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    )

    return new Response(
      JSON.stringify({
        token,
        uid,
        channelName,
        expiresAt: privilegeExpiredTs,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
