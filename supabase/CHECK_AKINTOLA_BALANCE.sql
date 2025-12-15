-- =====================================================================
-- DIAGNOSTIC CHECK FOR akintola.a@a-isolution.com BALANCE
-- Check why balance shows 41,300 coins
-- =====================================================================

-- Step 1: Check current balance
SELECT 
  p.email,
  p.full_name,
  COALESCE(p.masjid_coin_balance, 0) as current_balance_coins,
  COALESCE(p.masjid_coin_balance, 0) / 100 as current_balance_naira
FROM profiles p
WHERE p.email = 'akintola.a@a-isolution.com';

-- Step 2: Check ALL raw transactions for this user
SELECT 
  t.id,
  t.created_at,
  t.user_id,
  t.recipient_id,
  t.amount as amount_coins,
  t.amount / 100 as amount_naira,
  t.status,
  t.payment_status,
  t.type,
  t.description,
  t.note,
  t.payment_reference,
  p.email as user_email,
  r.email as recipient_email,
  r.role as recipient_role,
  CASE 
    WHEN t.user_id = p.id AND t.recipient_id IS NULL AND (t.note ILIKE '%deposit%' OR t.note ILIKE '%paystack%' OR t.type = 'deposit') THEN '💰 DEPOSIT'
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL AND t.note ILIKE '%zakat%' THEN '🕌 ZAKAT DONATION'
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam')) THEN '📞 CONSULTATION FEE'
    WHEN t.user_id = p.id AND t.recipient_id IS NULL AND t.note ILIKE '%withdrawal%' THEN '💸 WITHDRAWAL'
    WHEN t.recipient_id = p.id THEN '📥 PAYMENT RECEIVED'
    ELSE '❓ OTHER'
  END as transaction_type
FROM masjid_coin_transactions t
JOIN profiles p ON p.id = t.user_id
LEFT JOIN profiles r ON r.id = t.recipient_id
WHERE p.email = 'akintola.a@a-isolution.com'
   OR r.email = 'akintola.a@a-isolution.com'
ORDER BY t.created_at DESC;

-- Step 3: Breakdown by transaction category with COMPLETED status
WITH user_id AS (SELECT id FROM profiles WHERE email = 'akintola.a@a-isolution.com')
SELECT 
  'Deposits (Completed)' as category,
  COUNT(*) as transaction_count,
  COALESCE(SUM(amount), 0) as total_coins,
  COALESCE(SUM(amount), 0) / 100 as total_naira
FROM masjid_coin_transactions t
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.recipient_id IS NULL
  AND (t.note ILIKE '%deposit%' OR t.note ILIKE '%paystack%' OR t.type = 'deposit')
  AND t.status = 'completed'
UNION ALL
SELECT 
  'Deposits (Pending/Failed)' as category,
  COUNT(*) as transaction_count,
  COALESCE(SUM(amount), 0) as total_coins,
  COALESCE(SUM(amount), 0) / 100 as total_naira
FROM masjid_coin_transactions t
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.recipient_id IS NULL
  AND (t.note ILIKE '%deposit%' OR t.note ILIKE '%paystack%' OR t.type = 'deposit')
  AND t.status != 'completed'
UNION ALL
SELECT 
  'Zakat Donations' as category,
  COUNT(*) as transaction_count,
  COALESCE(SUM(amount), 0) as total_coins,
  COALESCE(SUM(amount), 0) / 100 as total_naira
FROM masjid_coin_transactions t
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.recipient_id IS NOT NULL
  AND t.note ILIKE '%zakat%'
  AND t.status = 'completed'
UNION ALL
SELECT 
  'Consultation Fees' as category,
  COUNT(*) as transaction_count,
  COALESCE(SUM(amount), 0) as total_coins,
  COALESCE(SUM(amount), 0) / 100 as total_naira
FROM masjid_coin_transactions t
LEFT JOIN profiles r ON r.id = t.recipient_id
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.recipient_id IS NOT NULL
  AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam'))
  AND t.status = 'completed'
UNION ALL
SELECT 
  'Withdrawals' as category,
  COUNT(*) as transaction_count,
  COALESCE(SUM(amount), 0) as total_coins,
  COALESCE(SUM(amount), 0) / 100 as total_naira
FROM masjid_coin_transactions t
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.note ILIKE '%withdrawal%'
  AND t.status = 'completed'
UNION ALL
SELECT 
  'Payments Received (as scholar)' as category,
  COUNT(*) as transaction_count,
  COALESCE(SUM(amount), 0) as total_coins,
  COALESCE(SUM(amount), 0) / 100 as total_naira
FROM masjid_coin_transactions t
WHERE t.recipient_id = (SELECT id FROM user_id)
  AND t.status = 'completed';

-- Step 4: Calculate what balance SHOULD be
WITH user_id AS (SELECT id FROM profiles WHERE email = 'akintola.a@a-isolution.com')
SELECT 
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND recipient_id IS NULL 
    AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
    AND status = 'completed'), 0) as total_deposits_coins,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND recipient_id IS NULL 
    AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
    AND status = 'completed'), 0) / 100 as total_deposits_naira,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE recipient_id = (SELECT id FROM user_id)
    AND status = 'completed'), 0) as total_received_coins,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE recipient_id = (SELECT id FROM user_id)
    AND status = 'completed'), 0) / 100 as total_received_naira,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND recipient_id IS NOT NULL 
    AND status = 'completed'), 0) as total_spent_coins,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND recipient_id IS NOT NULL 
    AND status = 'completed'), 0) / 100 as total_spent_naira,
  -- Calculated balance
  (
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = (SELECT id FROM user_id) 
      AND recipient_id IS NULL 
      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
      AND status = 'completed'), 0) +
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE recipient_id = (SELECT id FROM user_id)
      AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = (SELECT id FROM user_id) 
      AND recipient_id IS NOT NULL 
      AND status = 'completed'), 0)
  ) as calculated_balance_coins,
  (
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = (SELECT id FROM user_id) 
      AND recipient_id IS NULL 
      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
      AND status = 'completed'), 0) +
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE recipient_id = (SELECT id FROM user_id)
      AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = (SELECT id FROM user_id) 
      AND recipient_id IS NOT NULL 
      AND status = 'completed'), 0)
  ) / 100 as calculated_balance_naira;

-- Step 5: Compare current vs calculated balance
SELECT 
  p.email,
  COALESCE(p.masjid_coin_balance, 0) as current_balance_coins,
  COALESCE(p.masjid_coin_balance, 0) / 100 as current_balance_naira,
  (
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NULL 
      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
      AND status = 'completed'), 0) +
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE recipient_id = p.id AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NOT NULL 
      AND status = 'completed'), 0)
  ) as calculated_balance_coins,
  (
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NULL 
      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
      AND status = 'completed'), 0) +
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE recipient_id = p.id AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NOT NULL 
      AND status = 'completed'), 0)
  ) / 100 as calculated_balance_naira,
  COALESCE(p.masjid_coin_balance, 0) - (
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NULL 
      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
      AND status = 'completed'), 0) +
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE recipient_id = p.id AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NOT NULL 
      AND status = 'completed'), 0)
  ) as difference_coins,
  (COALESCE(p.masjid_coin_balance, 0) - (
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NULL 
      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
      AND status = 'completed'), 0) +
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE recipient_id = p.id AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NOT NULL 
      AND status = 'completed'), 0)
  )) / 100 as difference_naira
FROM profiles p
WHERE p.email = 'akintola.a@a-isolution.com';

-- Step 6: FIX THE BALANCE (run this after reviewing the above)
-- UPDATE profiles 
-- SET masjid_coin_balance = (
--   COALESCE(
--     (SELECT SUM(amount) FROM masjid_coin_transactions 
--      WHERE user_id = profiles.id AND recipient_id IS NULL 
--      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%' OR type = 'deposit')
--      AND status = 'completed'),
--     0
--   ) +
--   COALESCE(
--     (SELECT SUM(amount) FROM masjid_coin_transactions 
--      WHERE recipient_id = profiles.id AND status = 'completed'),
--     0
--   ) -
--   COALESCE(
--     (SELECT SUM(amount) FROM masjid_coin_transactions 
--      WHERE user_id = profiles.id AND recipient_id IS NOT NULL 
--      AND status = 'completed'),
--     0
--   )
-- )
-- WHERE email = 'akintola.a@a-isolution.com';

-- Step 7: Verify after fix (uncomment Step 6 first, then run this)
-- SELECT 
--   p.email,
--   p.full_name,
--   COALESCE(p.masjid_coin_balance, 0) as updated_balance_coins,
--   COALESCE(p.masjid_coin_balance, 0) / 100 as updated_balance_naira,
--   '✅ Balance fixed!' as status
-- FROM profiles p
-- WHERE email = 'akintola.a@a-isolution.com';
