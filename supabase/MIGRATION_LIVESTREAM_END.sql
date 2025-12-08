-- =========================================================================
-- MIGRATION: Auto-end livestreams and deactivate mic
-- =========================================================================
-- Purpose:
-- - Ensure that when a livestream ends (`ended_at` set), the stream is marked
--   inactive and mic is deactivated.
-- - Adds `mic_active` column to `streams` if it doesn't exist.
-- - Adds trigger to keep `is_active` and `mic_active` consistent with `ended_at`.

DO $$
BEGIN
  -- Add mic_active column if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'streams' AND column_name = 'mic_active'
  ) THEN
    ALTER TABLE streams ADD COLUMN mic_active boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- One-time normalization: if ended_at is set, ensure flags are off
UPDATE streams
SET is_active = false,
    mic_active = false
WHERE ended_at IS NOT NULL;

-- Trigger function: enforce flags on end
CREATE OR REPLACE FUNCTION enforce_stream_end_flags()
RETURNS trigger AS $$
BEGIN
  -- If ended_at is set, force inactive and mic off
  IF NEW.ended_at IS NOT NULL THEN
    NEW.is_active := false;
    NEW.mic_active := false;
  END IF;

  -- If is_active is set to false, also ensure mic is off
  IF NEW.is_active = false THEN
    NEW.mic_active := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on insert/update
DROP TRIGGER IF EXISTS trg_enforce_stream_end_flags ON streams;
CREATE TRIGGER trg_enforce_stream_end_flags
BEFORE INSERT OR UPDATE ON streams
FOR EACH ROW
EXECUTE FUNCTION enforce_stream_end_flags();

-- Optional check: recent active streams should have mic flag consistent
-- This SELECT helps verify current state after migration
-- SELECT id, title, is_active, mic_active, started_at, ended_at
-- FROM streams
-- ORDER BY started_at DESC
-- LIMIT 20;
