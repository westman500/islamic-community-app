// Edge Function to handle Smile ID webhook callbacks
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('Smile ID callback received:', payload)

    // Extract relevant data from Smile ID callback
    const {
      job_id,
      user_id,
      job_complete,
      job_success,
      result,
      code,
      smile_job_id,
      partner_params,
      timestamp,
      signature
    } = payload

    // Verify signature (recommended for production)
    // const isValid = verifySmileIDSignature(payload, signature)
    // if (!isValid) {
    //   return new Response(JSON.stringify({ error: 'Invalid signature' }), {
    //     status: 401,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    //   })
    // }

    if (!user_id || !job_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id or job_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine verification status
    let status = 'pending'
    let verificationPassed = false
    
    if (job_complete) {
      status = job_success ? 'approved' : 'rejected'
      verificationPassed = job_success === true
    }

    // Update verification_data record
    const { error: updateError } = await supabaseClient
      .from('verification_data')
      .update({
        status: status,
        verified_at: job_complete ? new Date().toISOString() : null,
        data: {
          job_id: job_id,
          smile_job_id: smile_job_id,
          result: result,
          code: code,
          job_complete: job_complete,
          job_success: job_success,
          partner_params: partner_params,
          timestamp: timestamp,
          callback_received_at: new Date().toISOString()
        }
      })
      .eq('user_id', user_id)
      .eq('verification_type', 'smileid')
      .order('created_at', { ascending: false })
      .limit(1)

    if (updateError) {
      console.error('Error updating verification_data:', updateError)
      throw updateError
    }

    // If verification passed, update profile
    if (verificationPassed) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          smileid_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        throw profileError
      }

      // Create notification for user
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: user_id,
          type: 'verification_approved',
          title: '✅ Verification Approved!',
          message: 'Your Smile ID verification has been approved. You are now verified!',
          data: {
            verification_type: 'smileid',
            job_id: job_id
          }
        })

      console.log(`User ${user_id} verification approved`)
    } else if (status === 'rejected') {
      // Notify user of rejection
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: user_id,
          type: 'verification_rejected',
          title: '❌ Verification Failed',
          message: 'Your Smile ID verification was not successful. Please try again or contact support.',
          data: {
            verification_type: 'smileid',
            job_id: job_id,
            code: code
          }
        })

      console.log(`User ${user_id} verification rejected`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Callback processed successfully',
        status: status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error processing Smile ID callback:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
