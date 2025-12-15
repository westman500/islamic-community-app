-- ============================================================================
-- COMPREHENSIVE SYSTEM VALIDATION
-- Validates zakat, consultation, and masjid coin functionality
-- ============================================================================

-- ============================================================================
-- 1. CHECK DATABASE SCHEMA
-- ============================================================================
SELECT '=== CHECKING DATABASE SCHEMA ===' as section;

-- Check if all required columns exist
SELECT 
  'consultation_bookings columns' as check_name,
  COUNT(*) FILTER (WHERE column_name = 'session_started_at') as has_session_started_at,
  COUNT(*) FILTER (WHERE column_name = 'session_ends_at') as has_session_ends_at,
  COUNT(*) FILTER (WHERE column_name = 'consultation_duration') as has_consultation_duration,
  COUNT(*) FILTER (WHERE column_name = 'payment_status') as has_payment_status,
  COUNT(*) FILTER (WHERE column_name = 'amount_paid') as has_amount_paid
FROM information_schema.columns
WHERE table_name = 'consultation_bookings'
  AND column_name IN ('session_started_at', 'session_ends_at', 'consultation_duration', 'payment_status', 'amount_paid');

SELECT 
  'profiles columns' as check_name,
  COUNT(*) FILTER (WHERE column_name = 'masjid_coin_balance') as has_balance,
  COUNT(*) FILTER (WHERE column_name = 'consultation_fee') as has_consultation_fee,
  COUNT(*) FILTER (WHERE column_name = 'consultation_duration') as has_consultation_duration
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('masjid_coin_balance', 'consultation_fee', 'consultation_duration');

SELECT 
  'masjid_coin_transactions columns' as check_name,
  COUNT(*) FILTER (WHERE column_name = 'user_id') as has_user_id,
  COUNT(*) FILTER (WHERE column_name = 'recipient_id') as has_recipient_id,
  COUNT(*) FILTER (WHERE column_name = 'amount') as has_amount,
  COUNT(*) FILTER (WHERE column_name = 'type') as has_type,
  COUNT(*) FILTER (WHERE column_name = 'payment_status') as has_payment_status
FROM information_schema.columns
WHERE table_name = 'masjid_coin_transactions'
  AND column_name IN ('user_id', 'recipient_id', 'amount', 'type', 'payment_status');

-- ============================================================================
-- 2. CHECK SCHOLARS/IMAMS SETUP
-- ============================================================================
SELECT '=== CHECKING SCHOLARS/IMAMS SETUP ===' as section;

SELECT 
  id,
  email,
  full_name,
  role,
  masjid_coin_balance as balance_coins,
  (masjid_coin_balance * 100) as balance_naira,
  consultation_fee,
  consultation_duration,
  is_online
FROM profiles
WHERE role IN ('scholar', 'imam')
ORDER BY full_name;

-- ============================================================================
-- 3. VALIDATE TRANSACTION INTEGRITY
-- ============================================================================
SELECT '=== VALIDATING TRANSACTIONS ===' as section;

-- Check for incomplete transactions
SELECT 
  'Incomplete transactions' as check_name,
  COUNT(*) as count
FROM masjid_coin_transactions
WHERE payment_status NOT IN ('completed', 'failed', 'pending');

-- Check for orphaned transactions (invalid user_id or recipient_id)
SELECT 
  'Orphaned transactions (invalid user_id)' as check_name,
  COUNT(*) as count
FROM masjid_coin_transactions t
LEFT JOIN profiles p ON t.user_id = p.id
WHERE p.id IS NULL;

SELECT 
  'Orphaned transactions (invalid recipient_id)' as check_name,
  COUNT(*) as count
FROM masjid_coin_transactions t
LEFT JOIN profiles p ON t.recipient_id = p.id
WHERE p.id IS NULL AND t.recipient_id IS NOT NULL;

-- ============================================================================
-- 4. VERIFY SCHOLAR BALANCES MATCH TRANSACTIONS
-- ============================================================================
SELECT '=== VERIFYING SCHOLAR BALANCES ===' as section;

WITH scholar_transactions AS (
  SELECT 
    p.id,
    p.full_name,
    p.masjid_coin_balance as current_balance,
    COALESCE(SUM(
      CASE 
        WHEN t.recipient_id = p.id AND t.amount > 0 THEN t.amount
        WHEN t.user_id = p.id AND t.amount < 0 THEN t.amount
        ELSE 0
      END
    ), 0) as calculated_balance
  FROM profiles p
  LEFT JOIN masjid_coin_transactions t ON (t.recipient_id = p.id OR t.user_id = p.id)
    AND t.payment_status = 'completed'
  WHERE p.role IN ('scholar', 'imam')
  GROUP BY p.id, p.full_name, p.masjid_coin_balance
)
SELECT 
  full_name,
  current_balance,
  calculated_balance,
  (current_balance - calculated_balance) as difference,
  CASE 
    WHEN current_balance = calculated_balance THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM scholar_transactions
ORDER BY full_name;

-- ============================================================================
-- 5. CHECK RECENT ZAKAT TRANSACTIONS
-- ============================================================================
SELECT '=== RECENT ZAKAT TRANSACTIONS ===' as section;

SELECT 
  t.created_at,
  t.type,
  donor.full_name as donor_name,
  donor.email as donor_email,
  scholar.full_name as scholar_name,
  scholar.email as scholar_email,
  t.amount,
  (t.amount * 100) as amount_naira,
  t.payment_status,
  t.description
FROM masjid_coin_transactions t
LEFT JOIN profiles donor ON t.user_id = donor.id
LEFT JOIN profiles scholar ON t.recipient_id = scholar.id
WHERE t.type IN ('donation', 'zakat')
  AND t.created_at > NOW() - INTERVAL '7 days'
ORDER BY t.created_at DESC
LIMIT 10;

-- ============================================================================
-- 6. CHECK RECENT CONSULTATION TRANSACTIONS
-- ============================================================================
SELECT '=== RECENT CONSULTATION TRANSACTIONS ===' as section;

SELECT 
  t.created_at,
  t.type,
  member.full_name as member_name,
  member.email as member_email,
  scholar.full_name as scholar_name,
  scholar.email as scholar_email,
  t.amount,
  (t.amount * 100) as amount_naira,
  t.payment_status,
  t.description
FROM masjid_coin_transactions t
LEFT JOIN profiles member ON t.user_id = member.id
LEFT JOIN profiles scholar ON t.recipient_id = scholar.id
WHERE t.type IN ('consultation', 'consultation_extension')
  AND t.created_at > NOW() - INTERVAL '7 days'
ORDER BY t.created_at DESC
LIMIT 10;

-- ============================================================================
-- 7. CHECK ACTIVE CONSULTATIONS
-- ============================================================================
SELECT '=== ACTIVE CONSULTATIONS ===' as section;

SELECT 
  cb.id,
  cb.status,
  member.full_name as member_name,
  scholar.full_name as scholar_name,
  cb.consultation_duration as duration_minutes,
  cb.session_started_at,
  cb.session_ends_at,
  CASE 
    WHEN cb.session_started_at IS NULL THEN 'Not started'
    WHEN cb.session_ends_at > NOW() THEN 'Active'
    ELSE 'Expired'
  END as session_status,
  CASE 
    WHEN cb.session_ends_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (cb.session_ends_at - NOW())) / 60
    ELSE NULL
  END as minutes_remaining
FROM consultation_bookings cb
LEFT JOIN profiles member ON cb.user_id = member.id
LEFT JOIN profiles scholar ON cb.scholar_id = scholar.id
WHERE cb.status IN ('confirmed', 'pending')
  AND cb.payment_status = 'completed'
ORDER BY cb.session_started_at DESC NULLS LAST
LIMIT 10;

-- ============================================================================
-- 8. CHECK FOR COMMON ISSUES
-- ============================================================================
SELECT '=== CHECKING FOR COMMON ISSUES ===' as section;

-- Issue 1: Consultations with missing duration
SELECT 
  'Consultations with missing duration' as issue,
  COUNT(*) as count
FROM consultation_bookings
WHERE consultation_duration IS NULL OR consultation_duration = 0;

-- Issue 2: Scholars with no consultation fee set
SELECT 
  'Scholars with no consultation fee' as issue,
  COUNT(*) as count
FROM profiles
WHERE role IN ('scholar', 'imam')
  AND (consultation_fee IS NULL OR consultation_fee = 0);

-- Issue 3: Transactions with wrong payment_status
SELECT 
  'Transactions with invalid payment_status' as issue,
  COUNT(*) as count,
  array_agg(DISTINCT payment_status) as invalid_statuses
FROM masjid_coin_transactions
WHERE payment_status NOT IN ('completed', 'pending', 'failed');

-- Issue 4: Negative member balances
SELECT 
  'Members with negative balance' as issue,
  COUNT(*) as count
FROM profiles
WHERE role = 'member' 
  AND masjid_coin_balance < 0;

-- ============================================================================
-- 9. SUMMARY STATISTICS
-- ============================================================================
SELECT '=== SYSTEM SUMMARY ===' as section;

SELECT 
  'Total Members' as metric,
  COUNT(*) as value
FROM profiles WHERE role = 'member'
UNION ALL
SELECT 
  'Total Scholars/Imams',
  COUNT(*)
FROM profiles WHERE role IN ('scholar', 'imam')
UNION ALL
SELECT 
  'Total Zakat Transactions (7 days)',
  COUNT(*)
FROM masjid_coin_transactions
WHERE type IN ('donation', 'zakat')
  AND created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'Total Consultation Transactions (7 days)',
  COUNT(*)
FROM masjid_coin_transactions
WHERE type = 'consultation'
  AND created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'Active Consultations',
  COUNT(*)
FROM consultation_bookings
WHERE status IN ('confirmed', 'pending')
  AND payment_status = 'completed'
UNION ALL
SELECT 
  'Total Naira in System',
  COALESCE(SUM(masjid_coin_balance * 100), 0)
FROM profiles;

-- ============================================================================
-- 10. RECOMMENDATIONS
-- ============================================================================
SELECT '=== SYSTEM HEALTH CHECK COMPLETE ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE role IN ('scholar', 'imam') 
      AND (consultation_fee IS NULL OR consultation_fee = 0)
    ) THEN '⚠️ Some scholars need consultation fees configured'
    ELSE '✅ All scholars have consultation fees set'
  END as recommendation
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM masjid_coin_transactions 
      WHERE payment_status NOT IN ('completed', 'pending', 'failed')
    ) THEN '❌ Invalid payment statuses found - needs cleanup'
    ELSE '✅ All transaction statuses are valid'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE role = 'member' 
      AND masjid_coin_balance < 0
    ) THEN '⚠️ Members with negative balances found'
    ELSE '✅ All member balances are non-negative'
  END;
