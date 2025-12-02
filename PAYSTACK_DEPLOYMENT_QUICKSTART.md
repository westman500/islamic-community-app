# 🚀 Paystack Webhook Deployment - Quick Reference

## Prerequisites
```bash
npm install -g supabase     # Install Supabase CLI
supabase login              # Login to Supabase
```

## One-Time Setup

### 1. Link Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Set Secrets
```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_YOUR_SECRET_KEY
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Deploy Database Schema
```bash
# Option A: Via Dashboard
# Go to SQL Editor → Copy PAYSTACK_WITHDRAWALS_TABLE.sql → Run

# Option B: Via CLI
supabase db push
```

### 4. Deploy Edge Function
```bash
supabase functions deploy paystack-webhook
```

### 5. Configure Paystack Webhook
1. Go to https://dashboard.paystack.com/#/settings/developers
2. Click "Webhooks"
3. Add URL: `https://YOUR_PROJECT.supabase.co/functions/v1/paystack-webhook`
4. Select events: `charge.success`, `transfer.success`, `transfer.failed`
5. Save

## Verify Deployment

### Check Function Status
```bash
supabase functions list
```

### View Logs
```bash
supabase functions logs paystack-webhook --limit 50
```

### Stream Logs (Real-time)
```bash
supabase functions logs paystack-webhook --follow
```

## Test Webhook

### Send Test Event (Paystack Dashboard)
1. Go to Webhooks section
2. Click "Send Test Event"
3. Select `charge.success`
4. Check logs for 200 response

### Test Payment Flow
Use Paystack test card:
- Card: 4084 0840 8408 4081
- CVV: 408
- Expiry: Any future date
- OTP: 123456

## Update Secrets
```bash
# Update existing secret
supabase secrets set PAYSTACK_SECRET_KEY=new_secret_key

# View all secrets (names only)
supabase secrets list
```

## Redeploy Function
```bash
# After code changes
supabase functions deploy paystack-webhook

# Force redeploy
supabase functions deploy paystack-webhook --no-verify-jwt
```

## Troubleshooting

### Function Not Responding
```bash
# Check function logs
supabase functions logs paystack-webhook

# Verify secrets are set
supabase secrets list

# Redeploy function
supabase functions deploy paystack-webhook
```

### Webhook Signature Fails
```bash
# Verify secret key matches Paystack dashboard
supabase secrets set PAYSTACK_SECRET_KEY=correct_key_from_dashboard

# Redeploy after secret update
supabase functions deploy paystack-webhook
```

### Database Errors
```bash
# Check if table exists
supabase db diff

# Verify RLS policies
# Go to Dashboard → Database → withdrawal_requests → Policies
```

## Going Live

### Switch to Live Keys
```bash
# Update environment variables
VITE_PAYSTACK_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY
VITE_PAYSTACK_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY

# Update Supabase secrets
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY

# Redeploy
supabase functions deploy paystack-webhook
```

### Update Webhook URL
- Verify production URL uses HTTPS
- Update in Paystack dashboard
- Test with small transaction

## Monitoring

### View Transaction Logs
```sql
-- Recent deposits
SELECT * FROM masjid_coin_transactions 
WHERE type = 'deposit' 
ORDER BY created_at DESC 
LIMIT 10;

-- Recent withdrawals
SELECT * FROM withdrawal_requests 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed transactions
SELECT * FROM withdrawal_requests 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

### Paystack Dashboard
- Transactions: https://dashboard.paystack.com/#/transactions
- Webhooks: https://dashboard.paystack.com/#/settings/developers
- Settlement: https://dashboard.paystack.com/#/settlements

## Support
- Paystack Docs: https://paystack.com/docs
- Supabase Docs: https://supabase.com/docs
- Full Guide: See PAYSTACK_WEBHOOK_SETUP.md
