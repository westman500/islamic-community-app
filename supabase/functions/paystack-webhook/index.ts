// Supabase Edge Function: Paystack Webhook Handler
// Deno runtime
// Verifies Paystack signature and updates booking/payment status in Supabase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper: get raw body text
async function getRawBody(request: Request): Promise<string> {
  const arrayBuffer = await request.arrayBuffer();
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(arrayBuffer);
}

// Helper: secure compare
function safeEqual(a: string, b: string): boolean {
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  if (aBuf.length !== bBuf.length) return false;
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

// Verify signature using Paystack's local secret
async function verifySignature(raw: string, signature: string | null): Promise<boolean> {
  try {
    if (!signature) return false;
    const secret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET") || Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
    const computed = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, "0")).join("");
    return safeEqual(computed, signature);
  } catch (_) {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405, headers: { "content-type": "application/json" } });
  }

  const raw = await getRawBody(req);
  const signature = req.headers.get("x-paystack-signature");
  const valid = await verifySignature(raw, signature);
  if (!valid) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), { status: 401, headers: { "content-type": "application/json" } });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // Prefer service role; allow custom secret name fallback used in CLI: SERVICE_ROLE_KEY
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || Deno.env.get("SERVICE_ROLE_KEY")
    || Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ ok: false, error: "Missing Supabase env" }), { status: 500, headers: { "content-type": "application/json" } });
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const event = payload?.event as string | undefined;
  const data = payload?.data || {};

  // Map Paystack events to booking/payment updates
  // Assumes `consultation_bookings` has columns: id, paystack_reference, status, payment_status
  // status: pending|confirmed|cancelled ; payment_status: pending|success|failed

  const reference: string | undefined = data?.reference || data?.payment_reference || data?.metadata?.reference;
  if (!reference) {
    return new Response(JSON.stringify({ ok: false, error: "Missing payment reference" }), { status: 400, headers: { "content-type": "application/json" } });
  }

  let paymentStatus: "success" | "failed" | "pending" = "pending";
  let bookingStatus: "pending" | "confirmed" | "cancelled" = "pending";

  switch (event) {
    case "charge.success":
    case "paymentrequest.success":
    case "transfer.success":
      paymentStatus = "success";
      bookingStatus = "confirmed";
      break;
    case "charge.failed":
    case "paymentrequest.failed":
    case "transfer.failed":
      paymentStatus = "failed";
      bookingStatus = "cancelled";
      break;
    default:
      // Unknown or non-critical events: acknowledge but do not fail
      paymentStatus = data?.status === "success" ? "success" : data?.status === "failed" ? "failed" : "pending";
      bookingStatus = paymentStatus === "success" ? "confirmed" : bookingStatus;
      break;
  }

  // Update booking by matching paystack_reference (fallback to reference column)
  let { data: booking, error: findErr } = await supabase
    .from("consultation_bookings")
    .select("id, user_id, scholar_id, status, payment_status")
    .eq("paystack_reference", reference)
    .maybeSingle();
  if (!booking && !findErr) {
    const alt = await supabase
      .from("consultation_bookings")
      .select("id, user_id, scholar_id, status, payment_status")
      .eq("reference", reference)
      .maybeSingle();
    booking = alt.data || null;
    findErr = alt.error || null;
  }

  if (findErr) {
    return new Response(JSON.stringify({ ok: false, error: "Lookup error", detail: findErr.message }), { status: 500, headers: { "content-type": "application/json" } });
  }
  if (!booking) {
    // Gracefully ignore if no booking found
    return new Response(JSON.stringify({ ok: true, message: "No booking matched reference" }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // Try primary column names; on undefined column error, try fallbacks
  let { error: updErr } = await supabase
    .from("consultation_bookings")
    .update({ payment_status: paymentStatus, status: bookingStatus })
    .eq("id", booking.id);

  if (updErr && (updErr.code === "42703" || /column .* does not exist/i.test(updErr.message))) {
    // Fallbacks: payment_confirmed:boolean, state:text
    const payment_confirmed = paymentStatus === "success" ? true : paymentStatus === "failed" ? false : null;
    const state = bookingStatus;
    const altUpd = await supabase
      .from("consultation_bookings")
      .update({ payment_confirmed, state })
      .eq("id", booking.id);
    updErr = altUpd.error || null;
  }

  if (updErr) {
    return new Response(JSON.stringify({ ok: false, error: "Update failed", detail: updErr.message }), { status: 500, headers: { "content-type": "application/json" } });
  }

  // Optional: if confirmed, set scholar busy flag or enqueue notification
  if (bookingStatus === "confirmed") {
    // Attempt to mark scholar busy/offline (ignore errors)
    await supabase.from("profiles").update({ is_online: false }).eq("id", booking.scholar_id);
    // Optional: record payment row if table exists
    const paymentsInsert = await supabase
      .from("payments")
      .insert({
        booking_id: booking.id,
        provider: "paystack",
        reference,
        status: paymentStatus,
        raw_event: payload
      });
    void paymentsInsert;
  }

  return new Response(JSON.stringify({ ok: true, reference, paymentStatus, bookingStatus }), { status: 200, headers: { "content-type": "application/json" } });
});
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
      transaction_type: 'deposit' | 'donation' | 'withdrawal' | 'consultation' | 'livestream'
      recipient_id?: string
      booking_id?: string
      scholar_id?: string
      stream_id?: string
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
    // Convert deposited amount to MasjidCoins (100 Naira = 1 coin)
    const CONVERSION_RATE = 0.01
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

    // Update existing transaction record (created by frontend with pending status)
    const { error: txError } = await supabase
      .from('masjid_coin_transactions')
      .update({
        payment_status: 'completed',
        status: 'completed'
      })
      .eq('payment_reference', event.data.reference)
      .eq('user_id', userId)

    if (txError) throw txError

    console.log(`✅ Deposit successful: ${coinsToAdd} coins added to user ${userId}`)

  } else if (transactionType === 'consultation') {
    // Handle consultation booking payment
    const bookingId = event.data.metadata.booking_id
    if (!bookingId) throw new Error('No booking ID for consultation payment')

    // Update booking payment status
    const { error: bookingError } = await supabase
      .from('consultation_bookings')
      .update({
        payment_status: 'completed',
        paid_at: event.data.paid_at
      })
      .eq('payment_reference', event.data.reference)

    if (bookingError) throw bookingError

    // Transfer funds to scholar's balance
    const scholarId = event.data.metadata.scholar_id
    if (scholarId) {
      const { data: scholarProfile, error: scholarError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', scholarId)
        .single()

      if (scholarError) throw scholarError

      const newScholarBalance = (scholarProfile.masjid_coin_balance || 0) + amountInNaira

      const { error: updateScholarError } = await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newScholarBalance })
        .eq('id', scholarId)

      if (updateScholarError) throw updateScholarError
    }

    console.log(`✅ Consultation payment confirmed: ${amountInNaira} Naira for booking ${bookingId}`)

  } else if (transactionType === 'livestream') {
    // Handle livestream access payment
    const streamId = event.data.metadata.stream_id
    if (!streamId) throw new Error('No stream ID for livestream payment')

    // Update stream access payment status
    const { error: accessError } = await supabase
      .from('stream_access_payments')
      .update({
        payment_status: 'completed',
        paid_at: event.data.paid_at
      })
      .eq('payment_reference', event.data.reference)

    if (accessError) throw accessError

    // Transfer funds to scholar's balance
    const scholarId = event.data.metadata.scholar_id
    if (scholarId) {
      const { data: scholarProfile, error: scholarError } = await supabase
        .from('profiles')
        .select('masjid_coin_balance')
        .eq('id', scholarId)
        .single()

      if (scholarError) throw scholarError

      const newScholarBalance = (scholarProfile.masjid_coin_balance || 0) + amountInNaira

      const { error: updateScholarError } = await supabase
        .from('profiles')
        .update({ masjid_coin_balance: newScholarBalance })
        .eq('id', scholarId)

      if (updateScholarError) throw updateScholarError
    }

    console.log(`✅ Livestream access payment confirmed: ${amountInNaira} Naira for stream ${streamId}`)

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
