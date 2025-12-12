-- =====================================================================
-- CHECK BALANCE ISSUE FOR ssl4live@gmail.com
-- =====================================================================

-- Step 1: Check current profile balance
SELECT 
  id,
  email,
  full_name,
  role,
  COALESCE(masjid_coin_balance, 0) as current_balance,
  created_at
FROM profiles 
WHERE email = 'ssl4live@gmail.com';

-- Step 2: Check ALL transactions for this user (sent and received)
SELECT 
  t.id,
  t.created_at,
  t.user_id,
  t.recipient_id,
  t.amount,
  t.currency,
  t.status,
  t.note,
  CASE 
    WHEN t.user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') AND t.recipient_id IS NULL THEN 'DEPOSIT'
    WHEN t.user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') AND t.recipient_id IS NOT NULL THEN 'PAYMENT SENT'
    WHEN t.recipient_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') THEN 'PAYMENT RECEIVED'
    ELSE 'OTHER'
  END as transaction_type,
  CASE 
    WHEN t.user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') AND t.recipient_id IS NULL THEN t.amount
    WHEN t.user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') AND t.recipient_id IS NOT NULL THEN -t.amount
    WHEN t.recipient_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') THEN t.amount
    ELSE 0
  END as balance_effect
FROM masjid_coin_transactions t
WHERE t.user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com')
   OR t.recipient_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com')
ORDER BY t.created_at DESC;

-- Step 3: Calculate what balance SHOULD be
SELECT 
  'ssl4live@gmail.com' as email,
  COALESCE(SUM(CASE 
    WHEN t.recipient_id = p.id THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
    ELSE 0
  END), 0) as calculated_balance,
  COUNT(t.id) as total_transactions,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_transactions,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_transactions
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON (t.user_id = p.id OR t.recipient_id = p.id)
WHERE p.email = 'ssl4live@gmail.com'
GROUP BY p.id, p.email;

-- Step 4: Breakdown by transaction type
SELECT 
  CASE 
    WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN 'Deposits'
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN 'Payments Sent'
    WHEN t.recipient_id = p.id THEN 'Payments Received'
    ELSE 'Other'
  END as transaction_category,
  COUNT(*) as count,
  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_amount_completed,
  COALESCE(SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END), 0) as total_amount_pending
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON (t.user_id = p.id OR t.recipient_id = p.id)
WHERE p.email = 'ssl4live@gmail.com'
GROUP BY transaction_category
ORDER BY transaction_category;

-- Step 5: FIX the balance for this specific user
UPDATE profiles p
SET masjid_coin_balance = COALESCE((
  SELECT SUM(CASE 
    WHEN t.recipient_id = p.id THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
    WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
    ELSE 0
  END)
  FROM masjid_coin_transactions t
  WHERE (t.user_id = p.id OR t.recipient_id = p.id) AND t.status = 'completed'
), 0)
WHERE email = 'ssl4live@gmail.com';

-- Step 6: Verify the fix
SELECT 
  email,
  full_name,
  COALESCE(masjid_coin_balance, 0) as updated_balance,
  '✅ Balance updated based on transaction history' as status
FROM profiles 
WHERE email = 'ssl4live@gmail.com';

-- Step 7: Show updated transaction list with running balance
WITH user_transactions AS (
  SELECT 
    t.created_at,
    t.amount,
    t.status,
    t.note,
    CASE 
      WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN 'Deposit'
      WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN 'Payment to ' || (SELECT full_name FROM profiles WHERE id = t.recipient_id)
      WHEN t.recipient_id = p.id THEN 'Payment from ' || (SELECT full_name FROM profiles WHERE id = t.user_id)
    END as description,
    CASE 
      WHEN t.user_id = p.id AND t.recipient_id IS NULL THEN t.amount
      WHEN t.user_id = p.id AND t.recipient_id IS NOT NULL THEN -t.amount
      WHEN t.recipient_id = p.id THEN t.amount
      ELSE 0
    END as balance_change
  FROM profiles p
  LEFT JOIN masjid_coin_transactions t ON (t.user_id = p.id OR t.recipient_id = p.id)
  WHERE p.email = 'ssl4live@gmail.com'
    AND t.status = 'completed'
  ORDER BY t.created_at
)
SELECT 
  created_at,
  description,
  amount,
  balance_change,
  SUM(balance_change) OVER (ORDER BY created_at) as running_balance,
  status,
  note
FROM user_transactions
ORDER BY created_at DESC;
