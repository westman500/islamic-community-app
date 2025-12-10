// Supabase Edge Function: Process Withdrawal via Paystack Transfer
// Handles secure withdrawal processing to scholar's bank account

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WithdrawalRequest {
  amount: number // Amount in Naira
  reference: string
  scholar_id: string
  account_number: string
  bank_code: string
  account_name: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🚀 Withdrawal request received')

  try {
    // Get Paystack secret key
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecretKey) {
      console.error('❌ PAYSTACK_SECRET_KEY not found')
      return new Response(
        JSON.stringify({ success: false, message: 'Payment system not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('✅ Paystack key loaded')

    // Parse request body
    const body: WithdrawalRequest = await req.json()
    const { amount, reference, scholar_id, account_number, bank_code, account_name } = body

    if (!amount || !reference || !scholar_id || !account_number || !bank_code || !account_name) {
      console.error('❌ Missing required fields')
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('📥 Withdrawal details:', { amount, reference, account_number, bank_code })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing')
      return new Response(
        JSON.stringify({ success: false, message: 'Database not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Step 1: Search for existing recipient in Paystack (don't use saved recipient code)
    // This ensures we always use the correct recipient for the current API key (test/live)
    let recipientCode: string | undefined

    console.log('🔍 Searching for existing Paystack recipient...')
    
    try {
      const listResponse = await fetch('https://api.paystack.co/transferrecipient?perPage=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey.trim()}`,
          'Content-Type': 'application/json',
        },
      })

      if (listResponse.ok) {
        const listData = await listResponse.json()
        console.log(`📋 Found ${listData.data?.length || 0} recipients in Paystack`)
        
        const existing = listData.data?.find((r: any) => 
          r.details?.account_number === account_number && 
          r.details?.bank_code === bank_code
        )

        if (existing) {
          recipientCode = existing.recipient_code
          console.log('✅ Found existing recipient:', recipientCode)
        }
      } else {
        const errorData = await listResponse.json()
        console.warn('⚠️ Could not list recipients:', errorData)
      }
    } catch (listError) {
      console.warn('⚠️ Error listing recipients:', listError)
    }

    // If no recipient found, create new one
    if (!recipientCode) {
      console.log('📝 Creating new recipient...')
      
      const createResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: account_name,
          account_number: account_number,
          bank_code: bank_code,
          currency: 'NGN',
        }),
      })

      const createData = await createResponse.json()
      
      if (!createResponse.ok || !createData.status) {
        console.error('❌ Failed to create recipient:', createData)
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: createData.message || 'Failed to create recipient' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      recipientCode = createData.data.recipient_code
      console.log('✅ Created recipient:', recipientCode)
    }

    // Ensure we have a recipient code before proceeding
    if (!recipientCode) {
      console.error('❌ Failed to get or create recipient code')
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to setup recipient' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Step 2: Initiate transfer
    console.log('💸 Initiating transfer for ₦' + amount)
    
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100), // Convert Naira to kobo
        recipient: recipientCode,
        reason: 'Masjid Wallet Withdrawal',
        reference: reference,
      }),
    })

    const transferData = await transferResponse.json()
    console.log('💳 Transfer response:', transferResponse.status, transferData)

    if (!transferResponse.ok || !transferData.status) {
      console.error('❌ Transfer failed:', transferData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: transferData.message || 'Transfer failed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('✅ Transfer successful!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Withdrawal processed successfully',
        transfer: transferData.data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('💥 Withdrawal error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
