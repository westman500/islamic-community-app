-- AUTO-DELETE EXPIRED REELS AFTER 24 HOURS
-- This script creates a function and trigger to automatically delete reels older than 24 hours

-- Create function to delete expired reels and their storage files
CREATE OR REPLACE FUNCTION delete_expired_reels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete reels older than 24 hours
  DELETE FROM islamic_reels
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  -- Note: Storage files should be handled separately via RLS or a scheduled job
  -- because PL/pgSQL cannot directly call storage.remove()
END;
$$;

-- Create a function to mark expired reels as inactive (alternative to deletion)
CREATE OR REPLACE FUNCTION mark_expired_reels_inactive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark reels older than 24 hours as inactive
  UPDATE islamic_reels
  SET is_active = false
  WHERE created_at < NOW() - INTERVAL '24 hours'
    AND is_active = true;
END;
$$;

-- To run this manually:
-- SELECT delete_expired_reels(); -- Permanently deletes
-- OR
-- SELECT mark_expired_reels_inactive(); -- Just marks as inactive

-- To schedule automatic cleanup, you can:
-- 1. Use Supabase Edge Functions with cron
-- 2. Use pg_cron extension (if available)
-- 3. Call this function from your application periodically

-- Example pg_cron setup (if extension is available):
/*
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to run every hour
SELECT cron.schedule(
  'delete-expired-reels',
  '0 * * * *', -- Every hour at minute 0
  'SELECT mark_expired_reels_inactive();'
);
*/

-- Manual cleanup query (run this whenever needed):
-- DELETE FROM islamic_reels WHERE created_at < NOW() - INTERVAL '24 hours';
