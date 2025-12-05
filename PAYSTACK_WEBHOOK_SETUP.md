# 💳 Paystack Webhook Setup Guide

This guide walks you through setting up Paystack payment integration with webhook support for deposits, donations, and withdrawals.

## 📋 Prerequisites

1. **Paystack Account**
   - Sign up at https://paystack.com
   - Get your API keys (Public & Secret)
   - Verify your business (for live mode)

2. **Supabase Project**
   - Edge Functions enabled
   - Service role key available

## 🔧 Step 1: Configure Environment Variables

### Add to `.env` file:
```bash
# Paystack Keys (Get from Paystack Dashboard > Settings > API Keys)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_YOUR_PUBLIC_KEY_HERE
VITE_PAYSTACK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

### Add Supabase Secrets:
```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📦 Step 2: Deploy Database Schema

Run the SQL migration to create the `withdrawal_requests` table:

```bash
# Via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Open supabase/PAYSTACK_WITHDRAWALS_TABLE.sql
# 3. Run the script

# OR via CLI:
supabase db push
```

This creates:
- `withdrawal_requests` table with proper schema
- Indexes for performance
- RLS policies for security

## 🚀 Step 3: Deploy Edge Function

Deploy the Paystack webhook handler:

```bash
# Deploy the function
supabase functions deploy paystack-webhook

# Verify deployment
supabase functions list
```

Expected output:
```
┌────────────────────┬────────────────────────────────────────────────┬─────────┐
│ NAME               │ URL                                             │ STATUS  │
├────────────────────┼────────────────────────────────────────────────┼─────────┤
│ paystack-webhook   │ https://YOUR_PROJECT.supabase.co/functions/v1/ │ ACTIVE  │
│                    │ paystack-webhook                                │         │
└────────────────────┴────────────────────────────────────────────────┴─────────┘
```

## 🔗 Step 4: Configure Paystack Webhook

1. **Go to Paystack Dashboard**
   - Navigate to Settings > Webhooks
   - https://dashboard.paystack.com/#/settings/developers

2. **Add Webhook URL**
   ```
   https://hustlapp.onrender.com/api/paystackSub/webhook
   ```

3. **Select Events to Monitor**
   - ✅ `charge.success` - For successful deposits/donations
   - ✅ `transfer.success` - For successful withdrawals
   - ✅ `transfer.failed` - For failed withdrawals
   - ✅ `transfer.reversed` - For reversed transfers

4. **Save Configuration**
   - Paystack will show webhook as "Active"
   - Test webhook using "Send Test Event" button

## 🧪 Step 5: Test Webhook

### Test Locally (Optional)
```bash
# The webhook is handled by external service at:
# https://hustlapp.onrender.com/api/paystackSub/webhook

# To test locally, use ngrok to forward to your local backend:
ngrok http YOUR_LOCAL_PORT

# Update Paystack webhook URL temporarily to ngrok URL
https://YOUR_NGROK_URL.ngrok.io/api/paystackSub/webhook
```

### Test Payment Flow

1. **Test Deposit:**
```typescript
import { initializePaystackPayment, generatePaymentReference } from '@/utils/paystack'

const handleDeposit = async () => {
  try {
    const reference = generatePaymentReference('DEP')
    
    await initializePaystackPayment({
      email: 'user@example.com',
      amount: 1000, // 1000 Naira
      reference,
      metadata: {
        user_id: profile.id,
        transaction_type: 'deposit'
      }
    })
    
    console.log('Payment successful!')
  } catch (error) {
    console.error('Payment failed:', error)
  }
}
```

2. **Monitor Webhook:**
   - Go to Paystack Dashboard > Webhooks > Logs
   - Check for successful delivery (200 response)
   - Verify database was updated

## 📊 Step 6: Verify Database Updates

After successful payment, check:

```sql
-- Check user's coin balance
SELECT masjid_coin_balance FROM profiles WHERE id = 'user_id';

-- Check transaction record
SELECT * FROM masjid_coin_transactions 
WHERE payment_reference = 'your_reference'
ORDER BY created_at DESC;

-- Check withdrawal requests
SELECT * FROM withdrawal_requests 
WHERE user_id = 'scholar_id'
ORDER BY created_at DESC;
```

## 🔐 Security Best Practices

### 1. Webhook Signature Verification
The webhook handler automatically verifies Paystack signatures using SHA-512 HMAC:
```typescript
const computedSignature = crypto.subtle.digest('SHA-512', secretKey + body)
if (computedSignature !== signature) {
  throw new Error('Invalid signature')
}
```

### 2. Use Test Mode First
- Start with test keys (pk_test_*, sk_test_*)
- Use Paystack test cards: https://paystack.com/docs/payments/test-payments
- Switch to live keys only after thorough testing

### 3. Environment Variables
- Never commit API keys to git
- Use Supabase secrets for Edge Functions
- Use `.env.local` for local development (add to .gitignore)

### 4. RLS Policies
All payment-related tables have Row Level Security enabled:
- Users can only see their own transactions
- Only scholars can create withdrawal requests
- Only service role can update transaction statuses

## 💰 Payment Flows

### Flow 1: Deposit (User → MasjidCoins)
```
1. User clicks "Deposit" → Opens Paystack popup
2. User completes payment → Paystack charges card
3. Paystack sends webhook → charge.success event
4. Webhook handler converts Naira to coins (100:1 ratio - 100 Naira = 1 coin)
5. User balance updated in profiles table
6. Transaction recorded in masjid_coin_transactions
```

### Flow 2: Donation (User → Scholar)
```
1. User selects scholar and amount → Opens Paystack popup
2. User completes payment → Paystack charges card
3. Paystack sends webhook → charge.success event
4. Webhook handler updates scholar's balance directly
5. Transaction recorded with recipient_id
```

### Flow 3: Withdrawal (Scholar → Bank Account)
```
1. Scholar requests withdrawal → Creates withdrawal_request
2. Admin/System creates transfer recipient via Paystack API
3. System initiates transfer via Paystack API
4. Paystack sends webhook → transfer.success/failed event
5. Webhook handler updates withdrawal status
6. If failed, amount refunded to scholar's balance
```

## 🐛 Troubleshooting

### Issue: Webhook not receiving events
**Solution:**
- Check webhook URL is correct: https://hustlapp.onrender.com/api/paystackSub/webhook
- Verify HTTPS (required by Paystack)
- Check if Render service is running and accessible
- Test with "Send Test Event" in Paystack dashboard
- Check Render logs for incoming webhook requests

### Issue: Invalid signature error
**Solution:**
- Verify PAYSTACK_SECRET_KEY matches dashboard
- Check no extra whitespace in environment variable
- Ensure webhook body is read as raw text (not parsed JSON first)

### Issue: Duplicate transactions
**Solution:**
- Use idempotency with payment references
- Check for existing transaction before processing
- Paystack may retry webhooks - handle duplicates gracefully

### Issue: Amount mismatch
**Solution:**
- Remember Paystack uses kobo (divide by 100 for Naira)
- Check conversion rates (100 Naira = 1 MasjidCoin)
- Verify amount is rounded to 2 decimal places

## 📱 Testing Payment Methods

Paystack supports multiple payment channels in Nigeria:

### Test Cards (Test Mode Only)
```
Card Number: 4084 0840 8408 4081
CVV: 408
Expiry: Any future date
PIN: 0000 (for Verve cards)
OTP: 123456
```

### Available Channels
- 💳 **Card** - Visa, Mastercard, Verve
- 🏦 **Bank Transfer** - Direct bank account transfer
- 📱 **USSD** - *737# banking codes
- 💵 **Bank** - Direct debit
- 📲 **Mobile Money** - MTN, Airtel, etc.
- 🔲 **QR Code** - Scan to pay

## 📈 Monitoring

### View Webhook Logs
```bash
# View Render service logs:
# Go to https://dashboard.render.com
# Select your service > Logs tab

# Or check application logs if you have access to the backend
```

### Paystack Dashboard Metrics
- Go to Dashboard > Transactions
- Filter by status, date range, amount
- Export transaction reports
- View webhook delivery status

## 🔄 Going Live

When ready for production:

1. **Switch to Live Keys**
   ```bash
   VITE_PAYSTACK_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY
   VITE_PAYSTACK_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
   
   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
   ```

2. **Update Webhook URL**
   - Webhook URL remains: https://hustlapp.onrender.com/api/paystackSub/webhook
   - Verify HTTPS certificate and service is running

3. **Verify Business**
   - Complete KYC on Paystack
   - Add business documents
   - Set settlement account

4. **Test Small Transaction**
   - Process ₦100 test payment
   - Verify webhook delivery
   - Check database updates
   - Wait for settlement (T+1 days)

5. **Monitor Closely**
   - Check webhook logs daily
   - Review failed transactions
   - Handle edge cases
   - Monitor settlement reports

## 📚 Additional Resources

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Webhook Guide](https://paystack.com/docs/payments/webhooks)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Paystack API Reference](https://paystack.com/docs/api)

## 🆘 Support

- **Paystack Support:** support@paystack.com
- **Paystack Status:** https://status.paystack.com
- **Community:** https://paystack.com/support

---

**Note:** Always test thoroughly in test mode before going live. Never share your secret keys publicly.
