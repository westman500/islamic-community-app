// Edge function to track QR code scans and downloads
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrackingPayload {
  sessionCode: string
  eventType: 'scan' | 'download' | 'click'
  platform?: 'ios' | 'android' | 'web'
  deviceType?: string
  userAgent?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const payload: TrackingPayload = await req.json()
    const { sessionCode, eventType, platform, deviceType, userAgent } = payload

    if (!sessionCode) {
      return new Response(
        JSON.stringify({ error: 'Session code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client IP and additional metadata
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    const userAgentHeader = userAgent || req.headers.get('user-agent') || 'unknown'

    // Track based on event type
    if (eventType === 'scan') {
      // Call the track_qr_scan database function
      const { data, error } = await supabase.rpc('track_qr_scan', {
        p_session_code: sessionCode,
        p_device_id: null, // Could generate a fingerprint if needed
        p_device_type: deviceType || platform,
        p_ip_address: clientIP,
        p_user_agent: userAgentHeader
      })

      if (error) {
        console.error('Error tracking QR scan:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to track scan', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    else if (eventType === 'download' || eventType === 'click') {
      // Track download/click event
      const { data: session, error: sessionError } = await supabase
        .from('qr_code_sessions')
        .select('id')
        .eq('session_code', sessionCode)
        .eq('is_active', true)
        .single()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive session code' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Increment download count
      const { error: updateError } = await supabase
        .from('qr_code_sessions')
        .update({ 
          download_count: supabase.rpc('increment', { x: 1 }),
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      // Use raw SQL for increment since Supabase doesn't have increment method
      const { error: rawError } = await supabase.rpc('increment_download_count', {
        p_session_id: session.id
      })

      // If increment function doesn't exist, update manually
      if (rawError && rawError.code === '42883') {
        // Function doesn't exist, do a manual read-update
        const { data: currentSession, error: fetchError } = await supabase
          .from('qr_code_sessions')
          .select('download_count')
          .eq('id', session.id)
          .single()

        if (!fetchError && currentSession) {
          await supabase
            .from('qr_code_sessions')
            .update({ 
              download_count: (currentSession.download_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id)
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Download tracked', platform }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid event type. Use: scan, download, or click' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Track QR error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
