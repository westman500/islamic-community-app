# 🔴 URGENT FIX: Deposits Not Crediting to Wallet

## Problem Identified
The Paystack webhook URL is configured incorrectly, pointing to an old Render.com URL instead of your Supabase Edge Function. This means successful payments never trigger the balance update.

## Root Cause
- ❌ Current webhook URL: `https://hustlapp.onrender.com/api/paystackSub/webhook`
- ✅ Correct webhook URL: `https://jtmmeumzjcldqukpqcfi.supabase.co/functions/v1/paystack-webhook`

## Fix Steps

### Step 1: Update Paystack Webhook URL (CRITICAL - Do this FIRST)

1. Go to Paystack Dashboard: https://dashboard.paystack.com/#/settings/developers
2. Click on "Webhooks" section
3. Find the existing webhook or click "Add Webhook"
4. Update/Set the webhook URL to:
   ```
   https://jtmmeumzjcldqukpqcfi.supabase.co/functions/v1/paystack-webhook
   ```
5. Ensure these events are selected:
   - ✅ `charge.success`
   - ✅ `transfer.success`
   - ✅ `transfer.failed`
6. Click "Save"
7. Test webhook using "Send Test Event" button

### Step 2: Verify Edge Function is Deployed

Run this command to check if the webhook function exists:
```powershell
supabase functions list
```

If `paystack-webhook` is not listed, deploy it:
```powershell
supabase login
supabase link --project-ref jtmmeumzjcldqukpqcfi
supabase functions deploy paystack-webhook
```

### Step 3: Backfill Missing Deposits (Fix Past Transactions)

**Option A: Using Supabase Dashboard (RECOMMENDED)**
1. Go to: https://supabase.com/dashboard/project/jtmmeumzjcldqukpqcfi/editor
2. Open SQL Editor
3. Run the queries from `test-deposit-fix.sql` in this order:
   
   **First - Check the problem:**
   ```sql
   -- Find users with completed deposits but zero balance
   SELECT 
     p.id,
     p.email,
     p.masjid_coin_balance as current_balance,
     COUNT(t.id) as completed_deposits,
     COALESCE(SUM(t.amount), 0) as total_coins_should_have
   FROM profiles p
   INNER JOIN masjid_coin_transactions t ON t.user_id = p.id
   WHERE t.type = 'deposit'
     AND t.payment_status = 'completed'
     AND (p.masjid_coin_balance IS NULL OR p.masjid_coin_balance = 0)
   GROUP BY p.id, p.email, p.masjid_coin_balance
   HAVING COUNT(t.id) > 0;
   ```

   **Then - Apply the fix:**
   ```sql
   -- Initialize NULL balances
   UPDATE profiles
   SET masjid_coin_balance = 0
   WHERE masjid_coin_balance IS NULL;

   -- Credit all completed deposits
   UPDATE profiles p
   SET masjid_coin_balance = COALESCE(p.masjid_coin_balance, 0) + COALESCE(deposit_total.total_coins, 0)
   FROM (
     SELECT 
       user_id,
       SUM(amount) as total_coins
     FROM masjid_coin_transactions
     WHERE type = 'deposit'
       AND payment_status = 'completed'
     GROUP BY user_id
   ) as deposit_total
   WHERE p.id = deposit_total.user_id
     AND COALESCE(p.masjid_coin_balance, 0) < deposit_total.total_coins;
   ```

   **Finally - Verify:**
   ```sql
   -- Check balances match expected values
   SELECT 
     p.id,
     p.email,
     p.masjid_coin_balance as balance_after_fix,
     COALESCE(SUM(t.amount), 0) as expected_balance,
     CASE 
       WHEN p.masjid_coin_balance = COALESCE(SUM(t.amount), 0) THEN '✅ FIXED'
       ELSE '❌ MISMATCH'
     END as status
   FROM profiles p
   LEFT JOIN masjid_coin_transactions t ON t.user_id = p.id 
     AND t.type = 'deposit' 
     AND t.payment_status = 'completed'
   WHERE EXISTS (
     SELECT 1 FROM masjid_coin_transactions 
     WHERE user_id = p.id AND type = 'deposit' AND payment_status = 'completed'
   )
   GROUP BY p.id, p.email, p.masjid_coin_balance;
   ```

**Option B: Using PowerShell (Alternative)**
```powershell
# Connect to Supabase and run the fix script
supabase db push --file test-deposit-fix.sql
```

### Step 4: Test New Deposit

After fixing the webhook URL:
1. Make a small test deposit (100 Naira = 1 coin)
2. Complete Paystack payment
3. Wait 5-10 seconds
4. Click "Refresh" button in MasjidCoin wallet
5. ✅ Balance should update automatically

### Step 5: Monitor Webhook Logs

Check if webhook is working:
```powershell
supabase functions logs paystack-webhook --project-ref jtmmeumzjcldqukpqcfi
```

Look for:
- `✅ Deposit successful: X coins added to user Y`
- `Processing deposit for user...`

## Why This Happened

1. The webhook URL was set to an old Render.com deployment
2. Paystack successfully processed payments
3. But sent success notifications to the wrong endpoint
4. So the Supabase function never ran
5. Transaction records were created (frontend does this)
6. But balances were never updated (webhook should do this)

## Verification Checklist

- [ ] Paystack webhook URL updated to Supabase endpoint
- [ ] Webhook test event sent successfully
- [ ] Edge function deployed and active
- [ ] Past deposits backfilled using SQL script
- [ ] Test deposit completes and credits balance
- [ ] Realtime updates working (no manual refresh needed)

## Expected Behavior After Fix

1. User initiates deposit in app
2. Paystack payment popup opens
3. User completes payment
4. Paystack sends `charge.success` event to Supabase
5. Webhook function:
   - Updates transaction payment_status to 'completed'
   - Calculates coins (100 Naira = 1 coin)
   - Increments user's masjid_coin_balance
6. Realtime subscription detects profile update
7. UI automatically shows new balance (no refresh needed)

## Troubleshooting

### Balance still not updating after webhook fix:
1. Check Supabase function logs for errors
2. Verify webhook secret matches in Paystack and Supabase
3. Test webhook with Paystack's "Send Test Event"
4. Check browser console for realtime subscription errors

### Webhook test fails:
1. Verify edge function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs paystack-webhook`
3. Ensure PAYSTACK_SECRET_KEY is set in Supabase secrets
4. Redeploy function: `supabase functions deploy paystack-webhook`

### Backfill script doesn't work:
1. Check if transactions have payment_status='completed'
2. Verify user_id matches between tables
3. Run diagnostic queries first before UPDATE
4. Check for RLS policy restrictions
