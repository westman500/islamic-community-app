-- =====================================================================
-- FIX BALANCE TO MATCH TRANSACTION HISTORY
-- This script recalculates and fixes all user balances based on actual transaction history
-- Note: Uses masjid_coin_transactions table and masjid_coin_balance column
-- =====================================================================

-- Step 1: Show current balance mismatches
SELECT 
  p.id,
  p.email,
  p.full_name,
  COALESCE(p.masjid_coin_balance, 0) as current_balance,
  COALESCE(SUM(
    CASE 
      WHEN t.recipient_id = p.id THEN t.amount  -- Money received
      WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount  -- Deposits (no recipient)
      WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount  -- Money sent
      ELSE 0
    END
  ), 0) as calculated_balance,
  COALESCE(p.masjid_coin_balance, 0) - COALESCE(SUM(
    CASE 
      WHEN t.recipient_id = p.id THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
      ELSE 0
    END
  ), 0) as difference
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON (t.user_id = p.id OR t.recipient_id = p.id) AND t.status = 'completed'
GROUP BY p.id, p.email, p.full_name, p.masjid_coin_balance
HAVING COALESCE(p.masjid_coin_balance, 0) != COALESCE(SUM(
    CASE 
      WHEN t.recipient_id = p.id THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
      ELSE 0
    END
  ), 0)
ORDER BY ABS(COALESCE(p.masjid_coin_balance, 0) - COALESCE(SUM(
    CASE 
      WHEN t.recipient_id = p.id THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
      ELSE 0
    END
  ), 0)) DESC;

-- Step 2: Show transaction summary per user
SELECT 
  p.email,
  p.full_name,
  COALESCE(p.masjid_coin_balance, 0) as current_balance,
  COUNT(t.id) as total_transactions,
  COUNT(CASE WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN 1 END) as deposits_count,
  COALESCE(SUM(CASE WHEN t.user_id = p.id AND t.recipient_id IS NULL AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_deposits,
  COUNT(CASE WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN 1 END) as payments_sent_count,
  COALESCE(SUM(CASE WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_payments_sent,
  COUNT(CASE WHEN t.recipient_id = p.id THEN 1 END) as payments_received_count,
  COALESCE(SUM(CASE WHEN t.recipient_id = p.id AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_payments_received,
  COALESCE(SUM(CASE 
    WHEN t.recipient_id = p.id AND t.status = 'completed' THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NULL AND t.status = 'completed' THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL AND t.status = 'completed' THEN -t.amount
    ELSE 0
  END), 0) as calculated_balance
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON (t.user_id = p.id OR t.recipient_id = p.id)
GROUP BY p.id, p.email, p.full_name, p.masjid_coin_balance
ORDER BY p.email;

-- Step 3: Fix all user balances based on transaction history
UPDATE profiles p
SET masjid_coin_balance = COALESCE((
  SELECT SUM(CASE 
    WHEN t.recipient_id = p.id THEN t.amount  -- Money received
    WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount  -- Deposits
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount  -- Money sent
    ELSE 0
  END)
  FROM masjid_coin_transactions t
  WHERE (t.user_id = p.id OR t.recipient_id = p.id) AND t.status = 'completed'
), 0)
WHERE COALESCE(p.masjid_coin_balance, 0) != COALESCE((
  SELECT SUM(CASE 
    WHEN t.recipient_id = p.id THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
    ELSE 0
  END)
  FROM masjid_coin_transactions t
  WHERE (t.user_id = p.id OR t.recipient_id = p.id) AND t.status = 'completed'
), 0);

-- Step 4: Verify the fixes
SELECT 
  p.email,
  p.full_name,
  p.role,
  COALESCE(p.masjid_coin_balance, 0) as current_balance,
  COALESCE(SUM(CASE 
    WHEN t.recipient_id = p.id THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
    ELSE 0
  END), 0) as verified_balance,
  CASE 
    WHEN COALESCE(p.masjid_coin_balance, 0) = COALESCE(SUM(CASE 
      WHEN t.recipient_id = p.id THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
      ELSE 0
    END), 0) THEN '✅ CORRECT'
    ELSE '❌ MISMATCH'
  END as status
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON (t.user_id = p.id OR t.recipient_id = p.id) AND t.status = 'completed'
GROUP BY p.id, p.email, p.full_name, p.role, p.masjid_coin_balance
ORDER BY p.email;

-- Step 5: Check for orphaned transactions (transactions without valid users)
SELECT 
  t.id,
  t.user_id,
  t.recipient_id,
  t.amount,
  t.status,
  t.note,
  t.created_at,
  'Orphaned - User not found' as issue
FROM masjid_coin_transactions t
LEFT JOIN profiles p ON p.id = t.user_id
WHERE p.id IS NULL
ORDER BY t.created_at DESC;

-- Step 6: Check for pending transactions
SELECT 
  t.id,
  t.user_id,
  p.email,
  t.amount,
  t.status,
  t.note,
  t.created_at,
  CASE 
    WHEN t.created_at < NOW() - INTERVAL '24 hours' THEN '⚠️ Old pending transaction'
    ELSE 'Recent pending'
  END as age_note
FROM masjid_coin_transactions t
JOIN profiles p ON p.id = t.user_id
WHERE t.status = 'pending' 
  AND t.recipient_id IS NULL
ORDER BY t.created_at;

-- Step 7: Show summary of fixes applied
SELECT 
  '✅ Balance reconciliation complete!' as status,
  COUNT(*) as total_users,
  COALESCE(SUM(masjid_coin_balance), 0) as total_balance,
  COUNT(CASE WHEN role IN ('scholar', 'imam') THEN 1 END) as total_scholars
FROM profiles;

-- Step 8: Ensure all balances are non-negative
UPDATE profiles
SET masjid_coin_balance = 0
WHERE masjid_coin_balance < 0;

SELECT '✅ All negative balances corrected!' as final_status;
