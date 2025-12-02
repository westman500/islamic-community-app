import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

interface PaystackEvent {
  event: string
  data: {
    id: number
    domain: string
    status: string
    reference: string
    amount: number
    message: string | null
    gateway_response: string
    paid_at: string
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: {
      user_id: string
      transaction_type: 'deposit' | 'donation' | 'withdrawal'
      recipient_id?: string
      custom_fields?: Array<{ display_name: string; variable_name: string; value: string }>
    }
    customer: {
      id: number
      first_name: string
      last_name: string
      email: string
      customer_code: string
      phone: string | null
      metadata: any
    }
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      channel: string
      card_type: string
      bank: string
      country_code: string
      brand: string
      reusable: boolean
      signature: string
      account_name: string | null
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Paystack secret key from environment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not configured')
    }

    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()
    const hash = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(paystackSecretKey + body)
    )
    const computedSignature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (computedSignature !== signature) {
      console.error('Invalid signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse webhook payload
    const event: PaystackEvent = JSON.parse(body)
    console.log('Paystack webhook event:', event.event)
    console.log('Transaction reference:', event.data.reference)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different event types
    switch (event.event) {
      case 'charge.success': {
        await handleSuccessfulCharge(supabase, event)
        break
      }

      case 'transfer.success': {
        await handleSuccessfulTransfer(supabase, event)
        break
      }

      case 'transfer.failed': {
        await handleFailedTransfer(supabase, event)
        break
      }

      default:
        console.log('Unhandled event type:', event.event)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleSuccessfulCharge(supabase: any, event: PaystackEvent) {
  const { data, metadata } = event.data
  const userId = event.data.metadata.user_id
  const transactionType = event.data.metadata.transaction_type
  const amountInNaira = event.data.amount / 100 // Paystack sends amount in kobo

  console.log(`Processing ${transactionType} for user ${userId}, amount: ${amountInNaira}`)

  if (transactionType === 'deposit') {
    // Convert deposited amount to MasjidCoins (1 Naira = 10 coins)
    const CONVERSION_RATE = 10
    const coinsToAdd = Math.floor(amountInNaira * CONVERSION_RATE)

    // Update user's coin balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('masjid_coin_balance')
      .eq('id', userId)
      .single()

    if (profileError) throw profileError

    const newBalance = (profile.masjid_coin_balance || 0) + coinsToAdd

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ masjid_coin_balance: newBalance })
      .eq('id', userId)

    if (updateError) throw updateError

    // Record transaction
    const { error: txError } = await supabase
      .from('masjid_coin_transactions')
      .insert({
        user_id: userId,
        amount: coinsToAdd,
        type: 'deposit',
        description: `Deposited ${amountInNaira} Naira via Paystack`,
        payment_reference: event.data.reference,
        created_at: new Date().toISOString()
      })

    if (txError) throw txError

    console.log(`✅ Deposit successful: ${coinsToAdd} coins added to user ${userId}`)

  } else if (transactionType === 'donation') {
    // Handle direct donation to scholar
    const recipientId = event.data.metadata.recipient_id
    if (!recipientId) throw new Error('No recipient ID for donation')

    // Update scholar's wallet balance
    const { data: scholarProfile, error: scholarError } = await supabase
      .from('profiles')
      .select('masjid_coin_balance')
      .eq('id', recipientId)
      .single()

    if (scholarError) throw scholarError

    const newScholarBalance = (scholarProfile.masjid_coin_balance || 0) + amountInNaira

    const { error: updateScholarError } = await supabase
      .from('profiles')
      .update({ masjid_coin_balance: newScholarBalance })
      .eq('id', recipientId)

    if (updateScholarError) throw updateScholarError

    // Record donation transaction
    const { error: donationError } = await supabase
      .from('masjid_coin_transactions')
      .insert({
        user_id: userId,
        amount: -amountInNaira,
        type: 'donation',
        description: `Zakat donation via Paystack`,
        recipient_id: recipientId,
        payment_reference: event.data.reference,
        created_at: new Date().toISOString()
      })

    if (donationError) throw donationError

    console.log(`✅ Donation successful: ${amountInNaira} to scholar ${recipientId}`)
  }
}

async function handleSuccessfulTransfer(supabase: any, event: PaystackEvent) {
  const { reference } = event.data
  
  console.log(`Transfer successful: ${reference}`)

  // Update withdrawal status in database
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString(),
      transfer_code: event.data.reference
    })
    .eq('payment_reference', reference)

  if (error) throw error

  console.log(`✅ Withdrawal completed: ${reference}`)
}

async function handleFailedTransfer(supabase: any, event: PaystackEvent) {
  const { reference } = event.data
  
  console.log(`Transfer failed: ${reference}`)

  // Update withdrawal status and refund user
  const { data: withdrawal, error: fetchError } = await supabase
    .from('withdrawal_requests')
    .select('user_id, amount')
    .eq('payment_reference', reference)
    .single()

  if (fetchError) throw fetchError

  // Refund the amount to user's wallet
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('masjid_coin_balance')
    .eq('id', withdrawal.user_id)
    .single()

  if (profileError) throw profileError

  const newBalance = (profile.masjid_coin_balance || 0) + withdrawal.amount

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ masjid_coin_balance: newBalance })
    .eq('id', withdrawal.user_id)

  if (updateError) throw updateError

  // Mark withdrawal as failed
  const { error: withdrawalError } = await supabase
    .from('withdrawal_requests')
    .update({ 
      status: 'failed',
      failed_at: new Date().toISOString(),
      failure_reason: event.data.message
    })
    .eq('payment_reference', reference)

  if (withdrawalError) throw withdrawalError

  console.log(`✅ Withdrawal failed and amount refunded: ${reference}`)
}
