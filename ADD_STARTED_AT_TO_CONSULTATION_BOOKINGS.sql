-- ============================================================================
-- CONSULTATION SESSION TRACKING FIELDS
-- ============================================================================
-- NOTE: The consultation_bookings table already has session tracking fields:
--   - session_started_at: Set when scholar clicks "Start Session" button
--   - session_ends_at: Calculated as session_started_at + consultation_duration
--   - consultation_duration: Duration in minutes (default 30)
--
-- These fields are used by ConsultationMessaging.tsx to:
--   1. Show countdown timer during active sessions
--   2. Prevent cancellation after session starts
--   3. Auto-complete session when time expires
--
-- The timer ONLY starts when the scholar explicitly clicks "Start Session"
-- This is the intended behavior - scholars control when sessions begin
-- ============================================================================

-- Verify the existing session tracking columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'consultation_bookings'
  AND column_name IN ('session_started_at', 'session_ends_at', 'consultation_duration')
ORDER BY column_name;

-- Check if session tracking columns exist (should already exist from ADD_SESSION_TRACKING.sql)
DO $$
BEGIN
  -- Add session_started_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultation_bookings' AND column_name = 'session_started_at'
  ) THEN
    ALTER TABLE consultation_bookings 
      ADD COLUMN session_started_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN consultation_bookings.session_started_at 
      IS 'Timestamp when scholar started the consultation session';
  END IF;

  -- Add session_ends_at if not exists  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultation_bookings' AND column_name = 'session_ends_at'
  ) THEN
    ALTER TABLE consultation_bookings 
      ADD COLUMN session_ends_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN consultation_bookings.session_ends_at 
      IS 'Calculated end time = session_started_at + consultation_duration';
  END IF;

  -- Add consultation_duration if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultation_bookings' AND column_name = 'consultation_duration'
  ) THEN
    ALTER TABLE consultation_bookings 
      ADD COLUMN consultation_duration INTEGER DEFAULT 30;
    COMMENT ON COLUMN consultation_bookings.consultation_duration 
      IS 'Session duration in minutes';
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_session_started 
  ON consultation_bookings(session_started_at);

CREATE INDEX IF NOT EXISTS idx_consultation_bookings_session_ends 
  ON consultation_bookings(session_ends_at);

-- Show final status
SELECT 
  'Session tracking columns status:' as info,
  COUNT(*) FILTER (WHERE column_name = 'session_started_at') as has_session_started_at,
  COUNT(*) FILTER (WHERE column_name = 'session_ends_at') as has_session_ends_at,
  COUNT(*) FILTER (WHERE column_name = 'consultation_duration') as has_consultation_duration
FROM information_schema.columns
WHERE table_name = 'consultation_bookings'
  AND column_name IN ('session_started_at', 'session_ends_at', 'consultation_duration');
