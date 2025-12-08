-- =====================================================================
-- FIX TRANSACTION STATUS
-- Diagnose and fix deposit transaction status issues
-- =====================================================================

-- Step 1: Check all deposits and their statuses
SELECT 
  id,
  user_id,
  amount,
  type,
  description,
  payment_reference,
  payment_status,
  status,
  created_at
FROM public.masjid_coin_transactions
WHERE type = 'deposit'
ORDER BY created_at DESC
LIMIT 50;

-- Step 2: Find deposits with mismatched statuses
-- (where payment_status is 'success' but status is not 'completed')
SELECT 
  id,
  user_id,
  amount,
  payment_reference,
  payment_status,
  status,
  created_at
FROM public.masjid_coin_transactions
WHERE type = 'deposit'
  AND payment_status IN ('success', 'completed')
  AND status != 'completed'
ORDER BY created_at DESC;

-- Step 3: Find pending deposits that might have been completed
SELECT 
  t.id,
  t.user_id,
  p.email,
  p.full_name,
  t.amount,
  t.payment_reference,
  t.payment_status,
  t.status,
  t.created_at,
  -- Check if balance seems to have been credited
  p.masjid_coin_balance as current_balance
FROM public.masjid_coin_transactions t
JOIN public.profiles p ON p.id = t.user_id
WHERE t.type = 'deposit'
  AND t.payment_status = 'pending'
ORDER BY t.created_at DESC
LIMIT 20;

-- Step 4: Fix deposits where payment_status is 'success' but status is wrong
-- UNCOMMENT TO RUN:
/*
UPDATE public.masjid_coin_transactions
SET status = 'completed'
WHERE type = 'deposit'
  AND payment_status IN ('success', 'completed')
  AND status != 'completed';
*/

-- Step 5: Count transactions by status
SELECT 
  type,
  payment_status,
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM public.masjid_coin_transactions
GROUP BY type, payment_status, status
ORDER BY type, payment_status, status;

-- Step 6: Find users with balance mismatches
-- (users whose balance doesn't match their completed deposits minus spending)
WITH user_balances AS (
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.masjid_coin_balance as current_balance,
    COALESCE(SUM(CASE 
      WHEN t.type = 'deposit' AND (t.payment_status IN ('success', 'completed') OR t.status = 'completed')
      THEN t.amount
      ELSE 0
    END), 0) as total_deposits,
    COALESCE(SUM(CASE 
      WHEN t.type != 'deposit' AND t.status = 'completed'
      THEN t.amount
      ELSE 0
    END), 0) as total_spending
  FROM public.profiles p
  LEFT JOIN public.masjid_coin_transactions t ON t.user_id = p.id
  GROUP BY p.id, p.email, p.full_name, p.masjid_coin_balance
)
SELECT 
  *,
  (total_deposits - total_spending) as expected_balance,
  (current_balance - (total_deposits - total_spending)) as balance_difference
FROM user_balances
WHERE ABS(current_balance - (total_deposits - total_spending)) > 0.01
ORDER BY balance_difference DESC;

-- Step 7: Show recent successful payments from Paystack webhook
-- (to verify if webhook is updating statuses correctly)
SELECT 
  t.id,
  t.user_id,
  p.email,
  t.amount,
  t.payment_reference,
  t.payment_status,
  t.status,
  t.created_at,
  -- Time since creation
  EXTRACT(EPOCH FROM (NOW() - t.created_at))/60 as minutes_ago
FROM public.masjid_coin_transactions t
JOIN public.profiles p ON p.id = t.user_id
WHERE t.type = 'deposit'
  AND t.payment_status IN ('success', 'completed')
ORDER BY t.created_at DESC
LIMIT 20;

-- Success message
SELECT '✅ Transaction status analysis complete! Review results above.' AS status;
