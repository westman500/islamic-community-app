import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, scholarId, amount, streamTitle } = await req.json()

    // Validate inputs
    if (!userId || !scholarId || !amount || amount <= 0) {
      throw new Error('Invalid input parameters')
    }

    // Get user balance
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('masjid_coin_balance')
      .eq('id', userId)
      .single()

    if (userError) throw userError
    if (!userData) throw new Error('User not found')

    const userBalance = userData.masjid_coin_balance || 0
    if (userBalance < amount) {
      throw new Error(`Insufficient balance. You have ${userBalance} coins.`)
    }

    // Get scholar balance
    const { data: scholarData, error: scholarError } = await supabaseClient
      .from('profiles')
      .select('masjid_coin_balance')
      .eq('id', scholarId)
      .single()

    if (scholarError) throw scholarError
    if (!scholarData) throw new Error('Scholar not found')

    const scholarBalance = scholarData.masjid_coin_balance || 0

    // Record transaction
    const { error: txError } = await supabaseClient
      .from('masjid_coin_transactions')
      .insert({
        user_id: userId,
        amount: -amount,
        type: 'donation',
        description: `Zakat donation during livestream: ${streamTitle}`,
        recipient_id: scholarId
      })

    if (txError) throw txError

    // Update user balance
    const { error: updateUserError } = await supabaseClient
      .from('profiles')
      .update({ masjid_coin_balance: userBalance - amount })
      .eq('id', userId)

    if (updateUserError) throw updateUserError

    // Update scholar balance
    const { error: updateScholarError } = await supabaseClient
      .from('profiles')
      .update({ masjid_coin_balance: scholarBalance + amount })
      .eq('id', scholarId)

    if (updateScholarError) throw updateScholarError

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Zakat donation processed successfully',
        newBalance: userBalance - amount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
