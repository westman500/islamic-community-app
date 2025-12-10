-- Delete failed withdrawal transactions that were recorded but never completed
-- These are from testing before the Edge Function was properly deployed

-- First, let's see what we're about to delete
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
  AND payment_status IN ('pending', 'failed')
ORDER BY created_at DESC;

-- Delete ALL failed/pending withdrawal attempts
DELETE FROM public.masjid_coin_transactions
WHERE type = 'withdrawal'
  AND payment_status IN ('pending', 'failed');

-- Verify the deletion
SELECT 
  COUNT(*) as total_withdrawals,
  COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_withdrawals,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_withdrawals,
  COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_withdrawals
FROM public.masjid_coin_transactions
WHERE type = 'withdrawal';
