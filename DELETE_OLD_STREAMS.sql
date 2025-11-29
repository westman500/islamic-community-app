-- Delete old streams with null or invalid channel_name
-- Run this in Supabase SQL Editor to clean up database

-- First, let's see what we're deleting
SELECT id, title, channel_name, scholar_id, is_active, started_at, ended_at
FROM streams
WHERE channel_name IS NULL OR channel_name = '';

-- Delete stream participants for these streams first (foreign key constraint)
DELETE FROM stream_participants
WHERE stream_id IN (
  SELECT id FROM streams 
  WHERE channel_name IS NULL OR channel_name = ''
);

-- Delete stream reactions for these streams
DELETE FROM stream_reactions
WHERE stream_id IN (
  SELECT id FROM streams 
  WHERE channel_name IS NULL OR channel_name = ''
);

-- Delete stream access records for these streams
DELETE FROM stream_access
WHERE stream_id IN (
  SELECT id FROM streams 
  WHERE channel_name IS NULL OR channel_name = ''
);

-- Delete stream restrictions for these streams
DELETE FROM stream_restrictions
WHERE stream_id IN (
  SELECT id FROM streams 
  WHERE channel_name IS NULL OR channel_name = ''
);

-- Finally, delete the streams themselves
DELETE FROM streams
WHERE channel_name IS NULL OR channel_name = '';

-- Verify deletion
SELECT COUNT(*) as remaining_streams FROM streams;
SELECT COUNT(*) as remaining_participants FROM stream_participants;
