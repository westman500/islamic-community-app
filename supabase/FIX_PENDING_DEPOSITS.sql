-- =====================================================================
-- FIX PENDING DEPOSITS
-- Use this to manually complete pending deposits and update balances
-- =====================================================================

-- Step 1: Check all pending transactions
SELECT 
  id,
  user_id,
  amount,
  type,
  description,
  payment_reference,
  payment_status,
  created_at
FROM public.masjid_coin_transactions
WHERE payment_status = 'pending'
ORDER BY created_at DESC;

-- Step 2: Check user balances before update
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.masjid_coin_balance,
  COUNT(t.id) as pending_transactions,
  SUM(t.amount) as pending_coins
FROM public.profiles p
LEFT JOIN public.masjid_coin_transactions t ON p.id = t.user_id AND t.payment_status = 'pending'
GROUP BY p.id, p.email, p.full_name, p.masjid_coin_balance
HAVING COUNT(t.id) > 0;

-- Step 3: MANUALLY COMPLETE A SPECIFIC TRANSACTION (replace the payment_reference)
-- Uncomment and modify the lines below:

/*
-- Update transaction status
UPDATE public.masjid_coin_transactions
SET payment_status = 'completed', status = 'completed'
WHERE payment_reference = 'DEP_YOUR_PAYMENT_REFERENCE_HERE';

-- Add coins to user balance
UPDATE public.profiles
SET masjid_coin_balance = masjid_coin_balance + (
  SELECT amount 
  FROM public.masjid_coin_transactions 
  WHERE payment_reference = 'DEP_YOUR_PAYMENT_REFERENCE_HERE'
)
WHERE id = (
  SELECT user_id 
  FROM public.masjid_coin_transactions 
  WHERE payment_reference = 'DEP_YOUR_PAYMENT_REFERENCE_HERE'
);
*/

-- Step 4: AUTO-COMPLETE ALL TEST PENDING DEPOSITS (USE WITH CAUTION!)
-- This will complete all pending deposits and add coins to balances
-- Uncomment to use:

/*
DO $$
DECLARE
  tx RECORD;
BEGIN
  FOR tx IN 
    SELECT id, user_id, amount, payment_reference
    FROM public.masjid_coin_transactions
    WHERE payment_status = 'pending' AND type = 'deposit'
  LOOP
    -- Update transaction status
    UPDATE public.masjid_coin_transactions
    SET payment_status = 'completed', status = 'completed'
    WHERE id = tx.id;
    
    -- Add coins to user balance
    UPDATE public.profiles
    SET masjid_coin_balance = COALESCE(masjid_coin_balance, 0) + tx.amount
    WHERE id = tx.user_id;
    
    RAISE NOTICE 'Completed transaction % for user %, added % coins', 
      tx.payment_reference, tx.user_id, tx.amount;
  END LOOP;
END $$;
*/

-- Step 5: Verify balances after update
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.masjid_coin_balance,
  COUNT(t.id) as total_transactions,
  SUM(CASE WHEN t.payment_status = 'completed' THEN t.amount ELSE 0 END) as completed_coins,
  SUM(CASE WHEN t.payment_status = 'pending' THEN t.amount ELSE 0 END) as pending_coins
FROM public.profiles p
LEFT JOIN public.masjid_coin_transactions t ON p.id = t.user_id
WHERE p.masjid_coin_balance > 0 OR EXISTS (
  SELECT 1 FROM public.masjid_coin_transactions tx WHERE tx.user_id = p.id
)
GROUP BY p.id, p.email, p.full_name, p.masjid_coin_balance
ORDER BY p.masjid_coin_balance DESC;

-- Step 6: Check realtime publication (should show masjid_coin_transactions)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
