import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Proper HMAC SHA256 implementation for Agora token
async function hmacSha256(key: string, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  return await crypto.subtle.sign('HMAC', cryptoKey, messageData)
}

// Pack uint16 to bytes
function packUint16(num: number): Uint8Array {
  const buffer = new Uint8Array(2)
  buffer[0] = (num >> 8) & 0xFF
  buffer[1] = num & 0xFF
  return buffer
}

// Pack uint32 to bytes
function packUint32(num: number): Uint8Array {
  const buffer = new Uint8Array(4)
  buffer[0] = (num >> 24) & 0xFF
  buffer[1] = (num >> 16) & 0xFF
  buffer[2] = (num >> 8) & 0xFF
  buffer[3] = num & 0xFF
  return buffer
}

// Agora Token Builder with proper implementation
class AgoraTokenBuilder {
  static async buildToken(
    appId: string,
    appCertificate: string,
    channelName: string,
    uid: number,
    role: number,
    privilegeExpiredTs: number
  ): Promise<string> {
    const salt = Math.floor(Math.random() * 0xFFFFFFFF)
    const ts = Math.floor(Date.now() / 1000) + 24 * 3600

    // Build message
    const messageArray: number[] = []
    
    // Add salt (4 bytes)
    const saltBytes = packUint32(salt)
    messageArray.push(...saltBytes)
    
    // Add timestamp (4 bytes)
    const tsBytes = packUint32(ts)
    messageArray.push(...tsBytes)
    
    // Add privilege map (simplified - just expiration time)
    const privBytes = packUint32(privilegeExpiredTs)
    messageArray.push(...privBytes)

    const message = new Uint8Array(messageArray)
    
    // Create signature base
    const encoder = new TextEncoder()
    const channelBytes = encoder.encode(channelName)
    const uidBytes = packUint32(uid)
    
    const signingArray: number[] = []
    signingArray.push(...channelBytes)
    signingArray.push(...uidBytes)
    signingArray.push(...message)
    
    const signingMessage = new Uint8Array(signingArray)
    
    // Generate signature using HMAC-SHA256
    const signatureBuffer = await hmacSha256(appCertificate, new TextDecoder().decode(signingMessage))
    const signature = new Uint8Array(signatureBuffer)
    
    // Build final token
    const tokenArray: number[] = []
    tokenArray.push(...message)
    tokenArray.push(...signature)
    
    const tokenBytes = new Uint8Array(tokenArray)
    const tokenBase64 = btoa(String.fromCharCode(...tokenBytes))
    
    // Return version 007 token format
    return `007${appId}${tokenBase64}`
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

    // Generate numeric UID from user ID (Agora requires numeric UID)
    const uidNumber = parseInt(user.id.replace(/\D/g, '').substring(0, 9)) || Math.floor(Math.random() * 1000000)
    
    const expirationTimeInSeconds = 3600 // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    const token = await AgoraTokenBuilder.buildToken(
      appId,
      appCertificate,
      channelName,
      uidNumber,
      agoraRole,
      privilegeExpiredTs
    )

    return new Response(
      JSON.stringify({
        token,
        uid: String(uidNumber),
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
