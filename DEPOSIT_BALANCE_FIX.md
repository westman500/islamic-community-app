# Deposit Balance Not Showing - Troubleshooting Guide

## Issue
After successful Paystack payment, Masjid Coin balance doesn't update automatically.

## Root Causes

### 1. Webhook Not Processing Payment
**Symptom:** Transaction stays in "pending" status  
**Check:** Supabase Edge Function logs for `paystack-webhook`

**Solution A: Verify Webhook Configuration**
```powershell
# Check if webhook is deployed
# In Supabase Dashboard: Functions → paystack-webhook → Check deployment status
```

**Solution B: Manually Complete Pending Transactions**
```sql
-- Run this in Supabase SQL Editor
-- See: supabase/FIX_PENDING_DEPOSITS.sql

-- Step 1: Check pending transactions
SELECT * FROM masjid_coin_transactions WHERE payment_status = 'pending';

-- Step 2: Complete specific transaction (replace payment_reference)
UPDATE masjid_coin_transactions
SET payment_status = 'completed', status = 'completed'
WHERE payment_reference = 'DEP_YOUR_REFERENCE_HERE';

-- Step 3: Add coins to balance
UPDATE profiles
SET masjid_coin_balance = masjid_coin_balance + (
  SELECT amount FROM masjid_coin_transactions 
  WHERE payment_reference = 'DEP_YOUR_REFERENCE_HERE'
)
WHERE id = (
  SELECT user_id FROM masjid_coin_transactions 
  WHERE payment_reference = 'DEP_YOUR_REFERENCE_HERE'
);
```

### 2. Realtime Subscription Not Active
**Symptom:** Balance doesn't update without page refresh

**Solution: Verify Realtime Publication**
```sql
-- Check if table is published for realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Should show: masjid_coin_transactions
-- If missing, run:
ALTER PUBLICATION supabase_realtime ADD TABLE masjid_coin_transactions;
```

### 3. RLS Policies Blocking Updates
**Symptom:** Webhook can't update transaction status

**Solution: Verify System Update Policy**
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'masjid_coin_transactions';

-- Should have this policy:
CREATE POLICY "System can update transactions" 
ON public.masjid_coin_transactions
FOR UPDATE USING (true);
```

### 4. Paystack Webhook Not Receiving Events
**Symptom:** No webhook logs in Supabase

**Solution: Re-configure Paystack Webhook**
1. Go to Paystack Dashboard → Settings → Webhooks
2. URL: `https://jtmmeumzjcldqukpqcfi.supabase.co/functions/v1/paystack-webhook`
3. Events to send:
   - ✅ charge.success
   - ✅ charge.failed
4. Copy webhook secret
5. Add to Supabase: Settings → Edge Functions → Environment Variables
   - Key: `PAYSTACK_WEBHOOK_SECRET`
   - Value: (paste secret from Paystack)

## Quick Fixes

### Fix 1: Manual Balance Update (Temporary)
```sql
-- Add coins manually (for testing)
UPDATE profiles 
SET masjid_coin_balance = masjid_coin_balance + 10 -- Add 10 coins
WHERE email = 'your-email@example.com';
```

### Fix 2: Use Refresh Button
The wallet now has a **Refresh** button in the balance card header:
1. Click "Refresh" after payment
2. Balance should update if transaction is completed

### Fix 3: Auto-Complete All Pending Deposits (Testing Only)
```sql
-- WARNING: Use only in testing/development!
-- This completes ALL pending deposits

DO $$
DECLARE
  tx RECORD;
BEGIN
  FOR tx IN 
    SELECT id, user_id, amount, payment_reference
    FROM masjid_coin_transactions
    WHERE payment_status = 'pending' AND type = 'deposit'
  LOOP
    UPDATE masjid_coin_transactions
    SET payment_status = 'completed', status = 'completed'
    WHERE id = tx.id;
    
    UPDATE profiles
    SET masjid_coin_balance = COALESCE(masjid_coin_balance, 0) + tx.amount
    WHERE id = tx.user_id;
    
    RAISE NOTICE 'Completed: %', tx.payment_reference;
  END LOOP;
END $$;
```

## Verification Steps

### 1. Check Transaction Status
```sql
SELECT 
  t.payment_reference,
  t.amount,
  t.payment_status,
  t.created_at,
  p.email,
  p.masjid_coin_balance
FROM masjid_coin_transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.type = 'deposit'
ORDER BY t.created_at DESC
LIMIT 10;
```

### 2. Check Webhook Logs
1. Supabase Dashboard → Functions → paystack-webhook
2. Click "Logs" tab
3. Look for:
   - ✅ `charge.success` events
   - ✅ `Processing deposit for user...`
   - ✅ `Deposit successful: X coins added`
   - ❌ Any errors

### 3. Check Browser Console
```javascript
// Should see these logs after deposit:
// 1. "Transaction update: {eventType: 'INSERT', ...}"
// 2. "Transaction update: {eventType: 'UPDATE', ...}" (when completed)
// 3. "Balance updated: {new: {masjid_coin_balance: X}}"
```

## Recent Fixes Applied

### Update 1: Listen to All Transaction Events
Changed from listening only to INSERT to listening to all events (INSERT + UPDATE):
```typescript
event: '*', // Listen to all events
```

### Update 2: Added Refresh Button
Users can now manually refresh their balance without reloading the page.

### Update 3: Enhanced Logging
Better console logging to track:
- Transaction creation
- Transaction status updates
- Balance changes

## Testing on Mobile (APK)

Since Paystack works better on mobile devices:

1. **Build APK:**
   ```powershell
   npm run build
   npx cap sync android
   cd android
   .\gradlew.bat assembleDebug
   ```

2. **Install on device:**
   - APK location: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Transfer to phone and install

3. **Test deposit:**
   - Use test card: 4084084084084081
   - Any future expiry date
   - Any CVV (e.g., 123)

4. **Check results:**
   - Transaction should complete immediately
   - Balance updates in real-time
   - No localhost restrictions

## Environment Variables Checklist

Ensure these are set in Supabase Edge Functions:

```env
PAYSTACK_SECRET_KEY=sk_test_xxxxx (or sk_live_xxxxx for production)
PAYSTACK_WEBHOOK_SECRET=xxxxx (from Paystack dashboard)
SUPABASE_URL=https://jtmmeumzjcldqukpqcfi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx (from Supabase settings)
```

## Contact Support

If issue persists:
1. Export webhook logs from Supabase
2. Export SQL query results showing pending transactions
3. Check browser console for errors
4. Verify Paystack test mode vs live mode
5. Contact Paystack support if webhook not receiving events

---

**Files Referenced:**
- `src/components/MasjidCoin.tsx` - Wallet component
- `supabase/functions/paystack-webhook/index.ts` - Webhook handler
- `supabase/FIX_PENDING_DEPOSITS.sql` - Manual fix script
- `supabase/DROP_AND_RECREATE_WALLET.sql` - Table setup

**Last Updated:** December 8, 2025
