-- Check all transactions for this scholar
SELECT 
  id,
  type,
  amount,
  payment_status,
  user_id,
  recipient_id,
  description,
  created_at
FROM public.masjid_coin_transactions
WHERE recipient_id = '917d2195-af14-4ef3-aaa7-29b8c9ec1f57'
   OR user_id = '917d2195-af14-4ef3-aaa7-29b8c9ec1f57'
ORDER BY created_at DESC;

-- Check for donation transactions
SELECT 
  id,
  type,
  amount,
  payment_status,
  recipient_id,
  created_at
FROM public.masjid_coin_transactions
WHERE type = 'donation'
  AND recipient_id = '917d2195-af14-4ef3-aaa7-29b8c9ec1f57'
ORDER BY created_at DESC;

-- Check current balance
SELECT 
  id,
  full_name,
  masjid_coin_balance,
  (masjid_coin_balance * 100) as balance_in_naira
FROM public.profiles
WHERE id = '917d2195-af14-4ef3-aaa7-29b8c9ec1f57';

-- Calculate expected balance from transactions
SELECT 
  SUM(CASE 
    WHEN recipient_id = '917d2195-af14-4ef3-aaa7-29b8c9ec1f57' THEN amount
    WHEN user_id = '917d2195-af14-4ef3-aaa7-29b8c9ec1f57' THEN -amount
    ELSE 0
  END) as calculated_balance
FROM public.masjid_coin_transactions
WHERE (recipient_id = '917d2195-af14-4ef3-aaa7-29b8c9ec1f57' 
   OR user_id = '917d2195-af14-4ef3-aaa7-29b8c9ec1f57')
  AND payment_status = 'completed';
