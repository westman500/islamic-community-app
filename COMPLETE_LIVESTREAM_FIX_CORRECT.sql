-- COMPLETE FIX FOR LIVESTREAM FUNCTIONALITY
-- Fixed version with correct column name: "channel" not "channel_name"

-- ====================================
-- STEP 1: Fix RLS Policies
-- ====================================

-- Drop ALL existing policies on streams table
DROP POLICY IF EXISTS "Streams are viewable by everyone" ON public.streams;
DROP POLICY IF EXISTS "Active streams viewable by everyone" ON public.streams;
DROP POLICY IF EXISTS "Scholars can create streams" ON public.streams;
DROP POLICY IF EXISTS "Scholars can insert own streams" ON public.streams;
DROP POLICY IF EXISTS "Scholars can update own streams" ON public.streams;
DROP POLICY IF EXISTS "Scholars can view own streams" ON public.streams;
DROP POLICY IF EXISTS "Scholars can delete own streams" ON public.streams;
DROP POLICY IF EXISTS "Anyone can view active streams" ON public.streams;

-- Enable RLS
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

-- Policy 1: ANYONE (authenticated users) can VIEW active streams
CREATE POLICY "authenticated_users_view_active_streams"
ON public.streams
FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy 2: Scholars/Imams can VIEW their own streams (active or ended)
CREATE POLICY "scholars_view_own_streams"
ON public.streams
FOR SELECT
TO authenticated
USING (
  auth.uid() = scholar_id
);

-- Policy 3: Scholars/Imams can CREATE streams
CREATE POLICY "scholars_create_streams"
ON public.streams
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = scholar_id
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('scholar', 'imam')
  )
);

-- Policy 4: Scholars/Imams can UPDATE their own streams
CREATE POLICY "scholars_update_own_streams"
ON public.streams
FOR UPDATE
TO authenticated
USING (auth.uid() = scholar_id)
WITH CHECK (auth.uid() = scholar_id);

-- Policy 5: Scholars/Imams can DELETE their own streams
CREATE POLICY "scholars_delete_own_streams"
ON public.streams
FOR DELETE
TO authenticated
USING (auth.uid() = scholar_id);

-- ====================================
-- STEP 2: Fix stream_participants policies
-- ====================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can join streams" ON public.stream_participants;
DROP POLICY IF EXISTS "Users can view own participations" ON public.stream_participants;
DROP POLICY IF EXISTS "Users can update own participations" ON public.stream_participants;

-- Enable RLS
ALTER TABLE public.stream_participants ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own participation
CREATE POLICY "users_insert_own_participation"
ON public.stream_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own participation
CREATE POLICY "users_view_own_participation"
ON public.stream_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own participation
CREATE POLICY "users_update_own_participation"
ON public.stream_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow scholars to view participants in their streams
CREATE POLICY "scholars_view_stream_participants"
ON public.stream_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.streams
    WHERE id = stream_participants.stream_id
    AND scholar_id = auth.uid()
  )
);

-- ====================================
-- STEP 3: Verify setup
-- ====================================

-- Check all policies on streams table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('streams', 'stream_participants')
ORDER BY tablename, policyname;

-- Test: Select active streams (should work for everyone)
SELECT 
  id, 
  title, 
  channel, 
  scholar_id, 
  is_active, 
  started_at,
  ended_at
FROM public.streams
WHERE is_active = true
ORDER BY started_at DESC;

-- Success message
SELECT '✅ Livestream permissions fixed! Users can now view active streams and scholars can create/manage them.' as status;
