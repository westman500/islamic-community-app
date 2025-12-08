-- =========================================================================
-- CLEANUP: Remove demo/test consultation bookings and mark demo data
-- =========================================================================

-- Add is_demo flag to consultation_bookings if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='consultation_bookings' AND column_name='is_demo'
  ) THEN
    ALTER TABLE consultation_bookings ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Mark demo bookings by common indicators (topic contains demo/test, demo users)
UPDATE consultation_bookings
SET is_demo = true
WHERE (
  topic ILIKE '%demo%' OR topic ILIKE '%test%'
)
OR user_id IN (
  SELECT id FROM profiles WHERE email ILIKE '%demo%' OR full_name ILIKE '%demo%'
);

-- Delete demo bookings (optional; comment out if you prefer to keep flagged)
DELETE FROM consultation_bookings WHERE is_demo = true;
