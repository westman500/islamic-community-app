-- Clean up old streams that are stuck as "live"
-- This marks streams older than 24 hours as ended

-- Mark old active streams as inactive
UPDATE public.streams
SET 
  is_active = false,
  ended_at = COALESCE(ended_at, started_at + INTERVAL '2 hours')
WHERE 
  is_active = true 
  AND started_at < NOW() - INTERVAL '24 hours';

-- Mark old stream participants as inactive
UPDATE public.stream_participants
SET 
  is_active = false,
  left_at = COALESCE(left_at, joined_at + INTERVAL '2 hours')
WHERE 
  is_active = true
  AND joined_at < NOW() - INTERVAL '24 hours';

-- Show cleaned up streams
SELECT 
  id,
  title,
  started_at,
  ended_at,
  is_active,
  EXTRACT(EPOCH FROM (COALESCE(ended_at, started_at + INTERVAL '2 hours') - started_at)) / 60 as duration_minutes
FROM public.streams
WHERE started_at < NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC
LIMIT 20;

SELECT 'Old streams cleaned up successfully' as status;
