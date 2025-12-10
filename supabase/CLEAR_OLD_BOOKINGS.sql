-- ============================================================================
-- CLEAR OLD CONSULTATION BOOKINGS
-- ============================================================================
-- INSTRUCTIONS: Copy and paste this entire script into Supabase SQL Editor and run it
-- ============================================================================

-- Step 1: View current bookings before deleting
SELECT 
  'BEFORE DELETE' as step,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed
FROM consultation_bookings;

-- Step 2: Delete completed and cancelled bookings
DELETE FROM consultation_bookings
WHERE status IN ('completed', 'cancelled');

-- Step 3: Verify what remains
SELECT 
  'AFTER DELETE' as step,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed
FROM consultation_bookings;

-- Step 4: View remaining active bookings
SELECT 
  id,
  topic,
  status,
  scholar_accepted,
  session_started_at,
  created_at
FROM consultation_bookings
ORDER BY created_at DESC;

-- ============================================================================
-- OPTIONAL: If you want to delete ALL bookings (uncomment line below)
-- ============================================================================
-- DELETE FROM consultation_bookings;

-- ============================================================================
-- After running this script:
-- 1. Refresh your app
-- 2. Check the console logs in browser DevTools
-- 3. The "My Bookings" tab should now show only active bookings
-- ============================================================================
