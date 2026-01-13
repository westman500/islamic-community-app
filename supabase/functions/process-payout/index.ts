// Edge function to process Paystack payouts securely
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYSTACK_BANK_CODES: Record<string, string> = {
  'access': '044',
  'gtbank': '058',
  'zenith': '057',
  'firstbank': '011',
  'uba': '033',
  'stanbic': '221',
  'sterling': '232',
  'union': '032',
  'wema': '035',
  'fidelity': '070',
  'polaris': '076',
  'fcmb': '214',
  'ecobank': '050',
  'keystone': '082',
  'kuda': '50211',
  'opay': '999992',
  'palmpay': '999991',
  'moniepoint': '50515'
}

interface PayoutRequest {
  marketerId: string
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    
    if (!paystackSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Paystack secret key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload: PayoutRequest = await req.json()
    
    const { marketerId, amount, bankName, accountNumber, accountName } = payload
    
    if (!marketerId || !amount || !bankName || !accountNumber || !accountName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const bankCode = PAYSTACK_BANK_CODES[bankName.toLowerCase()]
    
    if (!bankCode) {
      return new Response(
        JSON.stringify({ error: `Bank "${bankName}" not supported` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Step 1: Create transfer recipient
    const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN'
      })
    })
    
    const recipientData = await recipientResponse.json()
    
    if (!recipientData.status) {
      return new Response(
        JSON.stringify({ error: recipientData.message || 'Failed to create transfer recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const recipientCode = recipientData.data.recipient_code
    
    // Step 2: Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Paystack uses kobo
        recipient: recipientCode,
        reason: `MasjidMobile Marketer Payout - ${new Date().toISOString().split('T')[0]}`
      })
    })
    
    const transferData = await transferResponse.json()
    
    if (!transferData.status) {
      return new Response(
        JSON.stringify({ error: transferData.message || 'Failed to initiate transfer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Step 3: Record payout in database
    await supabase
      .from('marketer_payouts')
      .insert([{
        marketer_id: marketerId,
        amount: amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        status: transferData.data.status === 'success' ? 'paid' : 'pending',
        reference: transferData.data.transfer_code,
        processed_at: new Date().toISOString(),
        notes: `Paystack Transfer: ${transferData.data.transfer_code}`
      }])
    
    // Step 4: Update marketer balance
    const { data: marketer } = await supabase
      .from('cluster_marketers')
      .select('total_paid')
      .eq('id', marketerId)
      .single()
    
    await supabase
      .from('cluster_marketers')
      .update({
        pending_payout: 0,
        total_paid: (marketer?.total_paid || 0) + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', marketerId)
    
    return new Response(
      JSON.stringify({
        success: true,
        transferCode: transferData.data.transfer_code,
        status: transferData.data.status,
        amount: amount,
        message: `Transfer of ₦${amount.toLocaleString()} initiated successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Payout error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process payout', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
