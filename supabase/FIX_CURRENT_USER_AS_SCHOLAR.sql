-- =====================================================================
-- VERIFY AND FIX CURRENT USER AS SCHOLAR
-- Run this to check your account status and fix it if needed
-- =====================================================================

-- Step 1: Check current user status
SELECT 
  id,
  email, 
  role,
  full_name,
  is_online,
  consultation_fee,
  livestream_fee,
  live_consultation_fee,
  masjid_coin_balance,
  specialization
FROM profiles 
WHERE email = 'ssl4live@gmail.com';

-- Step 2: Update your account to be an online scholar with fees
UPDATE profiles 
SET 
  role = 'scholar',
  is_online = true,
  consultation_fee = 2500,
  livestream_fee = 5000,
  live_consultation_fee = 3000,
  specialization = COALESCE(specialization, 'Islamic Studies'),
  full_name = COALESCE(full_name, 'Test Scholar')
WHERE email = 'ssl4live@gmail.com';

-- Step 3: Verify the update worked
SELECT 
  id,
  email, 
  role,
  full_name,
  is_online,
  consultation_fee,
  livestream_fee,
  live_consultation_fee
FROM profiles 
WHERE email = 'ssl4live@gmail.com';

-- Step 4: Check if any scholars are now available
SELECT 
  COUNT(*) as total_scholars,
  COUNT(*) FILTER (WHERE is_online = true) as online_scholars,
  COUNT(*) FILTER (WHERE consultation_fee > 0) as scholars_with_fees,
  COUNT(*) FILTER (WHERE is_online = true AND consultation_fee > 0) as bookable_scholars
FROM profiles 
WHERE role IN ('scholar', 'imam');

-- Success message
SELECT '✅ Scholar account configured! Refresh the app to see changes.' AS status;
