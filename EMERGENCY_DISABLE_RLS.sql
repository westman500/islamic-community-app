-- EMERGENCY FIX: Temporarily disable RLS to test
-- This will help us confirm if RLS is the problem
-- Run this, test, then re-enable with proper policies

-- Disable RLS on streams table (TEMPORARY - for testing only)
ALTER TABLE public.streams DISABLE ROW LEVEL SECURITY;

-- Disable RLS on stream_participants table (TEMPORARY - for testing only)
ALTER TABLE public.stream_participants DISABLE ROW LEVEL SECURITY;

-- Now test:
-- 1. Start a livestream as scholar
-- 2. Try to view as regular user
-- 3. If it works, RLS was definitely the problem

-- After testing, run COMPLETE_LIVESTREAM_FIX.sql to re-enable with proper policies
