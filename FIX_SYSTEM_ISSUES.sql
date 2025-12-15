-- ============================================================================
-- FIX SYSTEM ISSUES
-- Addresses invalid payment statuses and missing scholar consultation fees
-- ============================================================================

-- ============================================================================
-- STEP 1: INVESTIGATE INVALID PAYMENT STATUSES
-- ============================================================================
SELECT '=== INVESTIGATING INVALID PAYMENT STATUSES ===' as step;

-- Find all invalid payment statuses in masjid_coin_transactions
SELECT 
  id,
  created_at,
  user_id,
  recipient_id,
  amount,
  type,
  payment_status,
  description
FROM masjid_coin_transactions
WHERE payment_status NOT IN ('completed', 'pending', 'failed')
ORDER BY created_at DESC;

-- Count by invalid status type
SELECT 
  payment_status,
  COUNT(*) as count
FROM masjid_coin_transactions
WHERE payment_status NOT IN ('completed', 'pending', 'failed')
GROUP BY payment_status;

-- ============================================================================
-- STEP 2: FIX INVALID PAYMENT STATUSES
-- ============================================================================
SELECT '=== FIXING INVALID PAYMENT STATUSES ===' as step;

-- Update common invalid statuses to 'completed'
-- Common issues: 'success', 'paid', 'confirmed', NULL, empty string
UPDATE masjid_coin_transactions
SET payment_status = 'completed'
WHERE payment_status IN ('success', 'paid', 'confirmed', 'approved', 'successful')
   OR payment_status IS NULL
   OR payment_status = '';

-- Report fix results
SELECT 
  'Invalid statuses fixed' as result,
  COUNT(*) as count
FROM masjid_coin_transactions
WHERE payment_status IN ('completed', 'pending', 'failed');

-- ============================================================================
-- STEP 3: INVESTIGATE SCHOLARS WITH MISSING CONSULTATION FEES
-- ============================================================================
SELECT '=== INVESTIGATING SCHOLARS WITHOUT CONSULTATION FEES ===' as step;

SELECT 
  id,
  email,
  full_name,
  role,
  masjid_coin_balance,
  consultation_fee,
  consultation_duration,
  is_online
FROM profiles
WHERE role IN ('scholar', 'imam')
  AND (consultation_fee IS NULL OR consultation_fee = 0)
ORDER BY full_name;

-- ============================================================================
-- STEP 4: SET DEFAULT CONSULTATION FEES
-- ============================================================================
SELECT '=== SETTING DEFAULT CONSULTATION FEES ===' as step;

-- Set default consultation fee (5 Masjid Coins = 500 Naira)
-- Set default duration (30 minutes)
UPDATE profiles
SET 
  consultation_fee = 5,
  consultation_duration = 30
WHERE role IN ('scholar', 'imam')
  AND (consultation_fee IS NULL OR consultation_fee = 0);

-- Report scholars updated
SELECT 
  'Scholars updated with default fees' as result,
  COUNT(*) as count
FROM profiles
WHERE role IN ('scholar', 'imam')
  AND consultation_fee = 5
  AND consultation_duration = 30;

-- ============================================================================
-- STEP 5: VERIFY FIXES
-- ============================================================================
SELECT '=== VERIFYING FIXES ===' as step;

-- Check no more invalid payment statuses
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All payment statuses are valid'
    ELSE '❌ Still have ' || COUNT(*) || ' invalid payment statuses'
  END as payment_status_check
FROM masjid_coin_transactions
WHERE payment_status NOT IN ('completed', 'pending', 'failed');

-- Check all scholars have consultation fees
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All scholars have consultation fees'
    ELSE '⚠️ Still have ' || COUNT(*) || ' scholars without fees'
  END as consultation_fee_check
FROM profiles
WHERE role IN ('scholar', 'imam')
  AND (consultation_fee IS NULL OR consultation_fee = 0);

-- Show current scholar configurations
SELECT 
  id,
  email,
  full_name,
  role,
  consultation_fee,
  consultation_duration,
  masjid_coin_balance
FROM profiles
WHERE role IN ('scholar', 'imam')
ORDER BY full_name;

-- ============================================================================
-- STEP 6: SUMMARY
-- ============================================================================
SELECT '=== FIX SUMMARY ===' as step;

SELECT 
  'Total Transactions' as metric,
  COUNT(*) as value,
  'completed: ' || COUNT(*) FILTER (WHERE payment_status = 'completed') ||
  ', pending: ' || COUNT(*) FILTER (WHERE payment_status = 'pending') ||
  ', failed: ' || COUNT(*) FILTER (WHERE payment_status = 'failed') as breakdown
FROM masjid_coin_transactions;

SELECT 
  'Total Scholars/Imams' as metric,
  COUNT(*) as value,
  'Average fee: ' || ROUND(AVG(consultation_fee), 2) || ' coins' as details
FROM profiles
WHERE role IN ('scholar', 'imam');

SELECT '=== SYSTEM CLEANUP COMPLETE ===' as final_message;
