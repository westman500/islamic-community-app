-- ============================================================================
-- FIX CONSULTATION BOOKING STATUS CONSTRAINT
-- ============================================================================
-- INSTRUCTIONS: Copy and paste this script into Supabase SQL Editor and run it
-- ============================================================================

-- Step 1: View current constraint
SELECT con.conname as constraint_name,
       pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'consultation_bookings'
  AND con.contype = 'c'
  AND con.conname LIKE '%status%';

-- Step 2: Drop the old status constraint
ALTER TABLE consultation_bookings
DROP CONSTRAINT IF EXISTS consultation_bookings_status_chk;

-- Step 3: Add new status constraint with 'completed' included
ALTER TABLE consultation_bookings
ADD CONSTRAINT consultation_bookings_status_chk 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));

-- Step 4: Verify the new constraint
SELECT con.conname as constraint_name,
       pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'consultation_bookings'
  AND con.contype = 'c'
  AND con.conname = 'consultation_bookings_status_chk';

-- ============================================================================
-- After running this script:
-- 1. Go back to your app
-- 2. Click "Mark Complete" again
-- 3. The booking should now be marked as completed successfully
-- ============================================================================
