-- =====================================================================
-- FIX BALANCE FOR ssl4live@gmail.com
-- Properly calculate: Deposits - (Zakat + Consultations + Withdrawals) = Balance
-- =====================================================================

-- Step 1: Check raw transactions with proper categorization
SELECT 
  t.id,
  t.created_at,
  t.user_id,
  t.recipient_id,
  t.amount,
  t.status,
  t.note,
  p.email as user_email,
  r.email as recipient_email,
  r.role as recipient_role,
  CASE 
    WHEN t.user_id = p.id AND t.recipient_id IS NULL AND (t.note ILIKE '%deposit%' OR t.note ILIKE '%paystack%') THEN '💰 DEPOSIT'
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL AND t.note ILIKE '%zakat%' THEN '🕌 ZAKAT DONATION'
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam')) THEN '📞 CONSULTATION FEE'
    WHEN t.user_id = p.id AND t.recipient_id IS NULL AND t.note ILIKE '%withdrawal%' THEN '💸 WITHDRAWAL'
    WHEN t.recipient_id = p.id THEN '📥 PAYMENT RECEIVED'
    ELSE '❓ OTHER'
  END as transaction_type,
  CASE 
    WHEN t.user_id = p.id AND t.recipient_id IS NULL AND (t.note ILIKE '%deposit%' OR t.note ILIKE '%paystack%') THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NULL AND t.note ILIKE '%withdrawal%' THEN -t.amount
    WHEN t.recipient_id = p.id THEN t.amount
    ELSE 0
  END as balance_effect
FROM masjid_coin_transactions t
JOIN profiles p ON p.id = t.user_id
LEFT JOIN profiles r ON r.id = t.recipient_id
WHERE p.email = 'ssl4live@gmail.com'
ORDER BY t.created_at DESC;

-- Step 2: Breakdown by transaction category
WITH user_id AS (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com')
SELECT 
  'Deposits' as category,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total
FROM masjid_coin_transactions t
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.recipient_id IS NULL
  AND (t.note ILIKE '%deposit%' OR t.note ILIKE '%paystack%')
  AND t.status = 'completed'
UNION ALL
SELECT 
  'Zakat Donations' as category,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total
FROM masjid_coin_transactions t
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.recipient_id IS NOT NULL
  AND t.note ILIKE '%zakat%'
  AND t.status = 'completed'
UNION ALL
SELECT 
  'Consultation Fees' as category,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total
FROM masjid_coin_transactions t
LEFT JOIN profiles r ON r.id = t.recipient_id
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.recipient_id IS NOT NULL
  AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam'))
  AND t.status = 'completed'
UNION ALL
SELECT 
  'Withdrawals' as category,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total
FROM masjid_coin_transactions t
WHERE t.user_id = (SELECT id FROM user_id)
  AND t.note ILIKE '%withdrawal%'
  AND t.status = 'completed'
UNION ALL
SELECT 
  'Payments Received' as category,
  COUNT(*) as count,
  COALESCE(SUM(amount), 0) as total
FROM masjid_coin_transactions t
WHERE t.recipient_id = (SELECT id FROM user_id)
  AND t.status = 'completed';

-- Step 3: Calculate correct balance formula
WITH user_id AS (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com')
SELECT 
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND recipient_id IS NULL 
    AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%')
    AND status = 'completed'), 0) as total_deposits,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND recipient_id IS NOT NULL 
    AND note ILIKE '%zakat%'
    AND status = 'completed'), 0) as total_zakat,
  COALESCE((SELECT SUM(t.amount) FROM masjid_coin_transactions t
    LEFT JOIN profiles r ON r.id = t.recipient_id
    WHERE t.user_id = (SELECT id FROM user_id) 
    AND t.recipient_id IS NOT NULL 
    AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam'))
    AND t.status = 'completed'), 0) as total_consultations,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND note ILIKE '%withdrawal%'
    AND status = 'completed'), 0) as total_withdrawals,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE recipient_id = (SELECT id FROM user_id)
    AND status = 'completed'), 0) as total_received,
  -- Final calculation: Deposits + Received - (Zakat + Consultations + Withdrawals)
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND recipient_id IS NULL 
    AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%')
    AND status = 'completed'), 0) +
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE recipient_id = (SELECT id FROM user_id)
    AND status = 'completed'), 0) -
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND recipient_id IS NOT NULL 
    AND note ILIKE '%zakat%'
    AND status = 'completed'), 0) -
  COALESCE((SELECT SUM(t.amount) FROM masjid_coin_transactions t
    LEFT JOIN profiles r ON r.id = t.recipient_id
    WHERE t.user_id = (SELECT id FROM user_id) 
    AND t.recipient_id IS NOT NULL 
    AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam'))
    AND t.status = 'completed'), 0) -
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = (SELECT id FROM user_id) 
    AND note ILIKE '%withdrawal%'
    AND status = 'completed'), 0) as calculated_balance;

-- Step 4: Transaction history with running balance
WITH user_profile AS (
  SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com'
),
transactions_categorized AS (
  SELECT 
    t.created_at,
    t.amount,
    t.status,
    t.note,
    CASE 
      WHEN t.user_id = (SELECT id FROM user_profile) AND t.recipient_id IS NULL AND (t.note ILIKE '%deposit%' OR t.note ILIKE '%paystack%') THEN '💰 Deposit'
      WHEN t.user_id = (SELECT id FROM user_profile) AND t.recipient_id IS NOT NULL AND t.note ILIKE '%zakat%' THEN '🕌 Zakat Donation'
      WHEN t.user_id = (SELECT id FROM user_profile) AND t.recipient_id IS NOT NULL AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam')) THEN '📞 Consultation Fee'
      WHEN t.user_id = (SELECT id FROM user_profile) AND t.note ILIKE '%withdrawal%' THEN '💸 Withdrawal'
      WHEN t.recipient_id = (SELECT id FROM user_profile) THEN '📥 Payment Received'
      ELSE '❓ Other'
    END as type,
    CASE 
      WHEN t.user_id = (SELECT id FROM user_profile) AND t.recipient_id IS NULL AND (t.note ILIKE '%deposit%' OR t.note ILIKE '%paystack%') THEN t.amount
      WHEN t.user_id = (SELECT id FROM user_profile) AND t.recipient_id IS NOT NULL THEN -t.amount
      WHEN t.user_id = (SELECT id FROM user_profile) AND t.note ILIKE '%withdrawal%' THEN -t.amount
      WHEN t.recipient_id = (SELECT id FROM user_profile) THEN t.amount
      ELSE 0
    END as balance_change,
    (SELECT email FROM profiles WHERE id = t.recipient_id) as paid_to
  FROM masjid_coin_transactions t
  LEFT JOIN profiles r ON r.id = t.recipient_id
  WHERE (t.user_id = (SELECT id FROM user_profile) OR t.recipient_id = (SELECT id FROM user_profile))
    AND t.status = 'completed'
)
SELECT 
  created_at,
  type,
  amount,
  CASE WHEN balance_change >= 0 THEN '+' || balance_change::text ELSE balance_change::text END as effect,
  SUM(balance_change) OVER (ORDER BY created_at) as running_balance,
  paid_to,
  note
FROM transactions_categorized
ORDER BY created_at DESC;

-- Step 5: Current vs Calculated Balance
SELECT 
  p.email,
  COALESCE(p.masjid_coin_balance, 0) as current_balance,
  (
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NULL 
      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%')
      AND status = 'completed'), 0) +
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE recipient_id = p.id AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NOT NULL 
      AND note ILIKE '%zakat%' AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(t.amount) FROM masjid_coin_transactions t
      LEFT JOIN profiles r ON r.id = t.recipient_id
      WHERE t.user_id = p.id AND t.recipient_id IS NOT NULL 
      AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam'))
      AND t.status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND note ILIKE '%withdrawal%'
      AND status = 'completed'), 0)
  ) as calculated_balance,
  COALESCE(p.masjid_coin_balance, 0) - (
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NULL 
      AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%')
      AND status = 'completed'), 0) +
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE recipient_id = p.id AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND recipient_id IS NOT NULL 
      AND note ILIKE '%zakat%' AND status = 'completed'), 0) -
    COALESCE((SELECT SUM(t.amount) FROM masjid_coin_transactions t
      LEFT JOIN profiles r ON r.id = t.recipient_id
      WHERE t.user_id = p.id AND t.recipient_id IS NOT NULL 
      AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam'))
      AND t.status = 'completed'), 0) -
    COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
      WHERE user_id = p.id AND note ILIKE '%withdrawal%'
      AND status = 'completed'), 0)
  ) as difference
FROM profiles p
WHERE p.email = 'ssl4live@gmail.com';

-- Step 6: FIX THE BALANCE
-- Formula: (Deposits + Payments Received) - (Zakat + Consultations + Withdrawals)
UPDATE profiles 
SET masjid_coin_balance = (
  -- Add deposits
  COALESCE(
    (SELECT SUM(amount) FROM masjid_coin_transactions 
     WHERE user_id = profiles.id AND recipient_id IS NULL 
     AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%')
     AND status = 'completed'),
    0
  ) +
  -- Add payments received
  COALESCE(
    (SELECT SUM(amount) FROM masjid_coin_transactions 
     WHERE recipient_id = profiles.id AND status = 'completed'),
    0
  ) -
  -- Subtract zakat donations
  COALESCE(
    (SELECT SUM(amount) FROM masjid_coin_transactions 
     WHERE user_id = profiles.id AND recipient_id IS NOT NULL 
     AND note ILIKE '%zakat%' AND status = 'completed'),
    0
  ) -
  -- Subtract consultation fees
  COALESCE(
    (SELECT SUM(t.amount) FROM masjid_coin_transactions t
     LEFT JOIN profiles r ON r.id = t.recipient_id
     WHERE t.user_id = profiles.id AND t.recipient_id IS NOT NULL 
     AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam'))
     AND t.status = 'completed'),
    0
  ) -
  -- Subtract withdrawals
  COALESCE(
    (SELECT SUM(amount) FROM masjid_coin_transactions 
     WHERE user_id = profiles.id AND note ILIKE '%withdrawal%'
     AND status = 'completed'),
    0
  )
)
WHERE email = 'ssl4live@gmail.com';

-- Step 7: Verify the fix with breakdown
SELECT 
  p.email,
  p.full_name,
  COALESCE(p.masjid_coin_balance, 0) as updated_balance,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = p.id AND recipient_id IS NULL 
    AND (note ILIKE '%deposit%' OR note ILIKE '%paystack%')
    AND status = 'completed'), 0) as deposits,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE recipient_id = p.id AND status = 'completed'), 0) as received,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = p.id AND recipient_id IS NOT NULL 
    AND note ILIKE '%zakat%' AND status = 'completed'), 0) as zakat,
  COALESCE((SELECT SUM(t.amount) FROM masjid_coin_transactions t
    LEFT JOIN profiles r ON r.id = t.recipient_id
    WHERE t.user_id = p.id AND t.recipient_id IS NOT NULL 
    AND (t.note ILIKE '%consultation%' OR r.role IN ('scholar', 'imam'))
    AND t.status = 'completed'), 0) as consultations,
  COALESCE((SELECT SUM(amount) FROM masjid_coin_transactions 
    WHERE user_id = p.id AND note ILIKE '%withdrawal%'
    AND status = 'completed'), 0) as withdrawals,
  '✅ Balance = (Deposits + Received) - (Zakat + Consultations + Withdrawals)' as formula
FROM profiles p
WHERE email = 'ssl4live@gmail.com';
