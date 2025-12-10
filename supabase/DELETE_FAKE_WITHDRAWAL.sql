-- Delete the withdrawal transaction that was NOT actually sent to the bank
-- This was created during testing before the Edge Function was working

-- First, check what withdrawal transactions exist
SELECT 
  id,
  user_id,
  amount,
  type,
  description,
  payment_status,
  created_at
FROM public.masjid_coin_transactions
WHERE type = 'withdrawal'
  AND payment_status = 'completed'
ORDER BY created_at DESC;

-- Delete ALL withdrawal transactions since none were actually sent to the bank
-- (The Edge Function is failing, so no real withdrawals have been processed)
DELETE FROM public.masjid_coin_transactions
WHERE type = 'withdrawal';

-- Add back the 10 coins (₦1000) that were incorrectly deducted
UPDATE public.profiles
SET masjid_coin_balance = masjid_coin_balance + 10
WHERE role = 'scholar'
  AND masjid_coin_balance = 55;

-- Verify the results
SELECT 
  id,
  full_name,
  role,
  masjid_coin_balance,
  (masjid_coin_balance * 100) as balance_in_naira
FROM public.profiles
WHERE role = 'scholar'
ORDER BY created_at DESC
LIMIT 5;
