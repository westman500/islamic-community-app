-- =====================================================================
-- Check scholar consultation fees and data
-- Run this in Supabase SQL Editor to verify scholar pricing
-- =====================================================================

-- Check all scholars/imams and their consultation fees
SELECT 
  id,
  full_name,
  role,
  email,
  consultation_fee,
  livestream_fee,
  live_consultation_fee,
  is_online,
  available_slots,
  specialization,
  specializations
FROM profiles
WHERE role IN ('scholar', 'imam')
ORDER BY full_name;

-- Count scholars with fees set
SELECT 
  COUNT(*) as total_scholars,
  COUNT(CASE WHEN consultation_fee > 0 THEN 1 END) as with_consultation_fee,
  COUNT(CASE WHEN is_online = true THEN 1 END) as online_scholars
FROM profiles
WHERE role IN ('scholar', 'imam');

-- Check if consultation_fee column exists and its type
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name LIKE '%fee%'
ORDER BY column_name;
