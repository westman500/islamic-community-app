// @ts-nocheck
// This file runs on Deno in Supabase Edge Functions. Suppress Node/TS tooling errors in VS Code.
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Agora RTC Token Builder 2 - Deno Implementation
 * Based on official Agora token generation specification
 * https://docs.agora.io/en/interactive-live-streaming/develop/authentication-workflow
 */

// Role types for Agora RTC
enum Role {
  PUBLISHER = 1,  // Can publish and subscribe to streams
  SUBSCRIBER = 2  // Can only subscribe to streams
}

// Privilege types
enum Privileges {
  JOIN_CHANNEL = 1,
  PUBLISH_AUDIO_STREAM = 2,
  PUBLISH_VIDEO_STREAM = 3,
  PUBLISH_DATA_STREAM = 4
}

// Service types
const SERVICE_TYPE_RTC = 1

// Pack uint16 to bytes (Big Endian)
function packUint16(value: number): Uint8Array {
  const buffer = new Uint8Array(2)
  buffer[0] = (value >> 8) & 0xFF
  buffer[1] = value & 0xFF
  return buffer
}

// Pack uint32 to bytes (Big Endian)
function packUint32(value: number): Uint8Array {
  const buffer = new Uint8Array(4)
  buffer[0] = (value >> 24) & 0xFF
  buffer[1] = (value >> 16) & 0xFF
  buffer[2] = (value >> 8) & 0xFF
  buffer[3] = value & 0xFF
  return buffer
}

// HMAC-SHA256
async function hmacSign(key: string, data: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  // crypto.subtle.sign expects a BufferSource; pass the underlying ArrayBuffer
  return await crypto.subtle.sign('HMAC', cryptoKey, data.buffer)
}

// Base64 encode for Agora format
function base64Encode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
}

// Pack string as: uint16 length + raw bytes (UTF-8)
function packString(value: string): Uint8Array {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(value)
  const buf = new Uint8Array(2 + bytes.length)
  buf.set(packUint16(bytes.length), 0)
  buf.set(bytes, 2)
  return buf
}

// Pack privilege map: uint16 count + repeated (uint16 key + uint32 expire)
function packPrivileges(privs: Map<number, number>): Uint8Array {
  const parts: Uint8Array[] = []
  parts.push(packUint16(privs.size))
  for (const [k, v] of privs) {
    parts.push(packUint16(k))
    parts.push(packUint32(v))
  }
  return concat(parts)
}

// Concatenate multiple Uint8Array
function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((acc, a) => acc + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

/**
 * Build AccessToken2 with UID
 * Follows Agora's official BuildTokenWithUid specification
 */
async function buildTokenWithUid(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  role: Role,
  tokenExpire: number,
  privilegeExpire: number
): Promise<string> {
  console.log('🔐 Building Agora Token with UID')
  console.log(`  App ID: ${appId}`)
  console.log(`  Channel: ${channelName}`)
  console.log(`  UID: ${uid}`)
  console.log(`  Role: ${role === Role.PUBLISHER ? 'PUBLISHER' : 'SUBSCRIBER'}`)
  
  // Generate random salt (32-bit)
  const salt = Math.floor(Math.random() * 0xFFFFFFFF)
  
  // AccessToken2 spec fields
  // issueTs: current epoch seconds
  // expire: lifetime (in seconds) NOT an absolute timestamp
  // salt: random 32-bit
  const now = Math.floor(Date.now() / 1000)
  const issueTs = now
  const expireSeconds = tokenExpire // lifetime seconds
  const privilegeExpiredTs = now + privilegeExpire // privilege expiry is absolute
  
  console.log(`  Token expires: ${tokenExpire}s, Privilege expires: ${privilegeExpire}s`)

  // Build privilege map
  const privileges = new Map<number, number>()
  privileges.set(Privileges.JOIN_CHANNEL, privilegeExpiredTs)
  
  if (role === Role.PUBLISHER) {
    privileges.set(Privileges.PUBLISH_AUDIO_STREAM, privilegeExpiredTs)
    privileges.set(Privileges.PUBLISH_VIDEO_STREAM, privilegeExpiredTs)
    privileges.set(Privileges.PUBLISH_DATA_STREAM, privilegeExpiredTs)
    console.log('  ✅ Publisher privileges granted')
  }

  // Convert App ID to UTF-8 bytes (exactly 32 bytes, zero-padded if needed)
  // App ID is stored as raw ASCII/UTF-8 string, NOT hex-decoded
  // e.g., "1a3cb8e2d1174dd097edcc38466983a0" -> 32 ASCII bytes
  const encoder = new TextEncoder()
  const appIdBytes = new Uint8Array(32) // Pre-filled with zeros
  const appIdUtf8 = encoder.encode(appId)
  appIdBytes.set(appIdUtf8.slice(0, 32)) // Copy up to 32 bytes, rest stays zero

  // Build AccessToken2 message (corrected ordering per spec):
  // appId(32) + issueTs(4) + expire(4) + salt(4) + serviceCount(2) + [services]

  // Prepare RTC service block
  // serviceType(uint16) + channel(string) + uid(string) + channelType(1) + privileges
  // In AccessToken2, uid "0" is represented as empty string
  const uidStr = uid === 0 ? '' : String(uid)
  const rtcServiceParts: Uint8Array[] = []
  // serviceType is uint16 per official spec
  rtcServiceParts.push(packUint16(SERVICE_TYPE_RTC))
  rtcServiceParts.push(packString(channelName))
  rtcServiceParts.push(packString(uidStr))
  // channelType: 1 for live, 0 for communication
  rtcServiceParts.push(new Uint8Array([1]))
  // privileges within service
  rtcServiceParts.push(packPrivileges(privileges))
  const rtcService = concat(rtcServiceParts)

  const message = concat([
    appIdBytes,
    packUint32(issueTs),
    packUint32(expireSeconds),
    packUint32(salt),
    packUint16(1), // one service
    rtcService
  ])

  // Signature is HMAC-SHA256 over the message
  const signingData = message

  // Generate HMAC-SHA256 signature
  const signature = await hmacSign(appCertificate, signingData)
  console.log('  ✅ Signature generated')
  console.log(`  🔎 Debug lengths -> message: ${message.length}, signature: ${signature.byteLength}`)
  console.log(`  Fields -> issueTs: ${issueTs}, expireSeconds: ${expireSeconds}, salt: ${salt}`)
  console.log(`  Service block length: ${rtcService.length}`)

  // Combine signature + message
  const tokenData = new Uint8Array(signature.byteLength + message.length)
  tokenData.set(new Uint8Array(signature), 0)
  tokenData.set(message, signature.byteLength)

  // Base64 encode the final token and add version prefix
  const tokenBase64 = base64Encode(tokenData)
  const token = `007${tokenBase64}` // Add AccessToken2 version prefix
  console.log(`  ✅ Token generated (length: ${token.length})`)
  
  return token
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  console.log('📥 Token generation request received')
  console.log('Request method:', req.method)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS preflight request')
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }
  
  try {
    const reqStart = Date.now()
    // Enforce Authorization header
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header')
      return new Response(JSON.stringify({ error: 'Unauthorized: Bearer token required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Authenticate user via Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const authRes = await supabaseClient.auth.getUser()
    const user = authRes.data?.user
    if (authRes.error || !user) {
      console.error('❌ Authentication failed:', authRes.error?.message)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    console.log(`✅ User authenticated: ${user.id}`)

    // Simple in-memory rate limiting (per user per minute)
    const limit = parseInt(Deno.env.get('RATE_LIMIT_PER_MIN') || '20')
    const nowMs = Date.now()
    const windowMs = 60_000
    const rlStore: Map<string, { count: number; windowStart: number }> = (globalThis as any).__AGORA_RL_STORE || new Map()
    ;(globalThis as any).__AGORA_RL_STORE = rlStore
    const key = user.id
    const entry = rlStore.get(key) || { count: 0, windowStart: nowMs }
    if (nowMs - entry.windowStart > windowMs) {
      entry.count = 0
      entry.windowStart = nowMs
    }
    entry.count += 1
    rlStore.set(key, entry)
    if (entry.count > limit) {
      console.warn(`🚫 Rate limit exceeded for user ${key}: ${entry.count}/${limit}`)
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again shortly.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    console.log(`🔢 Rate limit usage for ${key}: ${entry.count}/${limit}`)

    // Parse request body
    const { channelName, uid: requestedUid, role: requestedRole, expirationTimeInSeconds, debug } = await req.json()
    
    if (!channelName) {
      console.error('❌ Channel name is required')
      return new Response(JSON.stringify({ error: 'Channel name is required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get Agora credentials
    const appId = Deno.env.get('AGORA_APP_ID')
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE')
    
    if (!appId || !appCertificate) {
      console.error('❌ Agora credentials not configured')
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Process UID
    let uid: number
    if (typeof requestedUid === 'number') {
      uid = requestedUid
    } else if (typeof requestedUid === 'string') {
      // Hash string to uint32
      uid = Math.abs(requestedUid.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0)
      }, 0)) >>> 0
    } else {
      // Use UID 0 for compatibility (matches client-side)
      uid = 0
    }

    // Set role (default to PUBLISHER)
    const role = requestedRole === 2 ? Role.SUBSCRIBER : Role.PUBLISHER

    // Set expiration times
    const tokenExpire = expirationTimeInSeconds || 3600
    const privilegeExpire = expirationTimeInSeconds || 3600

    console.log(`📋 Token request params:`)
    console.log(`   Channel: ${channelName}`)
    console.log(`   UID: ${uid}`)
    console.log(`   Role: ${role === Role.PUBLISHER ? 'PUBLISHER' : 'SUBSCRIBER'}`)
    console.log(`   Expiry: ${tokenExpire}s`)

    // Generate token using official Agora specification
    const token = await buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      tokenExpire,
      privilegeExpire
    )
    const durationMs = Date.now() - reqStart

    console.log(`✅ Token generation successful in ${durationMs}ms`)
    // Optional debug breakdown
    if (debug) {
      const breakdown = {
        appId,
        channelName,
        uid,
        role: role === Role.PUBLISHER ? 'PUBLISHER' : 'SUBSCRIBER',
        issueTs: Math.floor(Date.now() / 1000),
        expireSeconds: tokenExpire,
        privilegeExpireSeconds: privilegeExpire,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 24) + '...',
        serviceType: SERVICE_TYPE_RTC,
        privileges: Array.from(['JOIN_CHANNEL','PUBLISH_AUDIO_STREAM','PUBLISH_VIDEO_STREAM','PUBLISH_DATA_STREAM'].entries())
      }
      return new Response(JSON.stringify({ token, appId, breakdown, durationMs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Optional structured logging to table if enabled
    try {
      if ((Deno.env.get('LOG_TOKENS') || 'false') === 'true') {
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        const payload = {
          user_id: user.id,
          channel: channelName,
          role: role === 1 ? 'PUBLISHER' : 'SUBSCRIBER',
          duration_ms: durationMs,
          success: true,
          created_at: new Date().toISOString()
        }
        const { error: logError } = await adminClient.from('agora_token_events').insert(payload)
        if (logError) console.warn('⚠️ Token log insert failed:', logError.message)
      }
    } catch (logEx) {
      console.warn('⚠️ Token logging error:', (logEx as any)?.message)
    }

    return new Response(JSON.stringify({ token, appId, durationMs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Token generation failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Token generation failed',
        details: (error as Error)?.message 
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
