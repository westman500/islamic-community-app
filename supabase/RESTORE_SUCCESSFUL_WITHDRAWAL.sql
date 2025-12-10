-- Restore the successful withdrawal transaction that was completed
-- This withdrawal was actually sent to the bank but got deleted from history

-- First, check current balance
SELECT 
  id,
  full_name,
  masjid_coin_balance,
  (masjid_coin_balance * 100) as balance_in_naira
FROM public.profiles
WHERE role = 'scholar'
ORDER BY created_at DESC
LIMIT 5;

-- Add back the 10 coins (₦1000) that were successfully withdrawn
-- The balance should go from 55 coins back to 65 coins
UPDATE public.profiles
SET masjid_coin_balance = masjid_coin_balance + 10
WHERE role = 'scholar'
  AND masjid_coin_balance = 55;

-- Verify the update
SELECT 
  id,
  full_name,
  masjid_coin_balance,
  (masjid_coin_balance * 100) as balance_in_naira
FROM public.profiles
WHERE role = 'scholar'
ORDER BY created_at DESC
LIMIT 5;
