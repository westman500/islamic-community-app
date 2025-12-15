-- ================================================
-- STOP AKT'S CURRENT ACTIVE LIVESTREAM
-- ================================================
-- This script stops any active livestreams for AKT user
-- Run this in Supabase SQL Editor

-- Step 1: Find AKT's profile and active streams
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    s.id as stream_id,
    s.title as stream_title,
    s.channel,
    s.created_at as stream_started,
    s.viewer_count,
    s.is_active,
    EXTRACT(EPOCH FROM (NOW() - s.created_at))/60 as minutes_active
FROM profiles p
LEFT JOIN streams s ON s.scholar_id = p.id AND s.is_active = true
WHERE p.email ILIKE '%akt%' 
   OR p.full_name ILIKE '%akt%'
   OR p.email ILIKE '%akintola%'
ORDER BY s.created_at DESC;

-- Step 2: Stop all active streams for AKT
-- UNCOMMENT AND RUN AFTER REVIEWING STEP 1
/*
UPDATE streams
SET 
    is_active = false,
    ended_at = NOW(),
    viewer_count = 0
WHERE scholar_id IN (
    SELECT id 
    FROM profiles 
    WHERE email ILIKE '%akt%' 
       OR full_name ILIKE '%akt%'
       OR email ILIKE '%akintola%'
)
AND is_active = true
RETURNING 
    id,
    title,
    channel,
    created_at,
    ended_at;
*/

-- Step 3: Verify streams are stopped
SELECT 
    p.full_name,
    p.email,
    s.id as stream_id,
    s.title,
    s.is_active,
    s.created_at,
    s.ended_at
FROM profiles p
LEFT JOIN streams s ON s.scholar_id = p.id
WHERE (p.email ILIKE '%akt%' 
   OR p.full_name ILIKE '%akt%'
   OR p.email ILIKE '%akintola%')
ORDER BY s.created_at DESC
LIMIT 10;

-- ================================================
-- INSTRUCTIONS:
-- 1. Run Step 1 to see AKT's active streams
-- 2. If active streams are found, uncomment Step 2 and run it
-- 3. Run Step 3 to verify streams are stopped
-- ================================================
