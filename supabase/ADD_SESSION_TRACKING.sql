-- ============================================================================
-- ADD SESSION TRACKING AND SCHOLAR ACCEPTANCE TO CONSULTATION_BOOKINGS
-- ============================================================================

-- Add session tracking columns
ALTER TABLE consultation_bookings
  ADD COLUMN IF NOT EXISTS consultation_duration INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS session_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scholar_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS scholar_accepted_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN consultation_bookings.consultation_duration IS 'Duration in minutes for the consultation session';
COMMENT ON COLUMN consultation_bookings.session_started_at IS 'Timestamp when scholar started the session';
COMMENT ON COLUMN consultation_bookings.session_ends_at IS 'Timestamp when session is scheduled to end';
COMMENT ON COLUMN consultation_bookings.scholar_accepted IS 'Whether scholar has accepted the consultation request';
COMMENT ON COLUMN consultation_bookings.scholar_accepted_at IS 'Timestamp when scholar accepted the consultation';

-- Update existing bookings to set scholar_accepted=true for confirmed bookings
UPDATE consultation_bookings
SET scholar_accepted = TRUE,
    scholar_accepted_at = created_at
WHERE status = 'confirmed' AND scholar_accepted IS NULL;
