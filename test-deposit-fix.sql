-- Diagnostic: Check if deposits are succeeding but balance not updating
-- Run this to see what's happening with deposits

-- 1. Check recent deposit transactions
SELECT 
  id,
  user_id,
  amount,
  type,
  payment_status,
  status,
  payment_reference,
  created_at,
  description
FROM masjid_coin_transactions
WHERE type = 'deposit'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check corresponding user balances
SELECT 
  p.id,
  p.email,
  p.masjid_coin_balance,
  COUNT(t.id) as total_deposits,
  COALESCE(SUM(CASE WHEN t.payment_status = 'completed' THEN t.amount ELSE 0 END), 0) as completed_deposit_coins
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON t.user_id = p.id AND t.type = 'deposit'
WHERE EXISTS (
  SELECT 1 FROM masjid_coin_transactions 
  WHERE user_id = p.id AND type = 'deposit'
)
GROUP BY p.id, p.email, p.masjid_coin_balance;

-- 3. Find users with completed deposits but zero balance (THE BUG)
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

-- 4. FIX: Manually credit all successful deposits to user balances
-- WARNING: This will backfill all missing deposits
-- Only run this ONCE after confirming the webhook issue is fixed

-- First, initialize any NULL balances
UPDATE profiles
SET masjid_coin_balance = 0
WHERE masjid_coin_balance IS NULL;

-- Then credit all completed deposits
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
  -- Only update if balance doesn't match expected
  AND COALESCE(p.masjid_coin_balance, 0) < deposit_total.total_coins;

-- 5. Verify fix worked
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
