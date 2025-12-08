-- ============================================================================
-- CLEANUP OLD STALE STREAMS
-- ============================================================================
-- This script marks old streams (older than 24 hours) as inactive
-- Run this once to clean up existing stale streams

-- Mark streams older than 24 hours as inactive
UPDATE streams
SET 
  is_active = false,
  mic_active = false,
  ended_at = COALESCE(ended_at, started_at + INTERVAL '2 hours')
WHERE 
  is_active = true 
  AND started_at < NOW() - INTERVAL '24 hours';

-- Show results
SELECT 
  id,
  title,
  started_at,
  ended_at,
  is_active,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600 AS hours_since_start
FROM streams
WHERE started_at < NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC
LIMIT 20;
