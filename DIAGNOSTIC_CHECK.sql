-- QUICK DIAGNOSTIC: Check what's in the database
-- Run this first to see what's happening

-- 1. Check if there are ANY streams at all
SELECT 
  COUNT(*) as total_streams,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_streams,
  COUNT(CASE WHEN is_active = false THEN 1 END) as ended_streams
FROM public.streams;

-- 2. View all streams with details
SELECT 
  id,
  title,
  channel_name,
  scholar_id,
  is_active,
  started_at,
  ended_at,
  created_at
FROM public.streams
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'streams';

-- 4. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'streams'
ORDER BY policyname;

-- 5. Check current user's role
SELECT 
  id,
  email,
  role,
  full_name
FROM public.profiles
WHERE email IN ('welshman221@gmail.com', 'ssl4live@gmail.com')
ORDER BY email;

-- If there are streams but users can't see them, it's 100% an RLS policy issue
-- Run COMPLETE_LIVESTREAM_FIX.sql after this to fix it
