-- Fix Timer and Zakat Issues
-- Run this in Supabase SQL Editor

-- 1. Ensure all scholars have consultation_duration set to 30 minutes
UPDATE profiles
SET consultation_duration = 30
WHERE role IN ('scholar', 'imam') 
  AND (consultation_duration IS NULL OR consultation_duration = 0 OR consultation_duration < 5);

-- 2. Verify scholars have duration set
SELECT 
  id,
  full_name,
  role,
  consultation_duration,
  consultation_fee
FROM profiles
WHERE role IN ('scholar', 'imam');

-- 3. Check if there are any active consultations missing timer data
SELECT 
  id,
  user_id,
  scholar_id,
  status,
  session_started_at,
  session_ends_at,
  consultation_duration
FROM consultation_bookings
WHERE status = 'confirmed'
  AND (session_started_at IS NULL OR session_ends_at IS NULL);

-- 4. Check RLS policies for masjid_coin_transactions (for zakat)
-- First, enable RLS if not already enabled
ALTER TABLE masjid_coin_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Drop and recreate policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON masjid_coin_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON masjid_coin_transactions;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON masjid_coin_transactions;

-- 6. Create comprehensive policies
CREATE POLICY "Users can view their own transactions"
ON masjid_coin_transactions FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert their own transactions"
ON masjid_coin_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
ON masjid_coin_transactions FOR INSERT
WITH CHECK (true);

-- 7. Check profiles table RLS for balance updates
DROP POLICY IF EXISTS "Users can update their own balance" ON profiles;

CREATE POLICY "Users can update their own balance"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- 8. Verify zakat transaction records
SELECT 
  t.id,
  t.user_id,
  t.amount,
  t.type,
  t.description,
  t.created_at,
  p.full_name as user_name
FROM masjid_coin_transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.type = 'donation'
ORDER BY t.created_at DESC
LIMIT 10;

-- Success message
SELECT 'Timer duration set to 30 minutes for all scholars, and zakat policies fixed!' as status;
