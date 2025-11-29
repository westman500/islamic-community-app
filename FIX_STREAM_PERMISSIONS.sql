-- Fix stream creation and viewing permissions
-- Run this in Supabase SQL Editor

-- First, check current policies on streams table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'streams';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Streams are viewable by everyone" ON public.streams;
DROP POLICY IF EXISTS "Active streams viewable by everyone" ON public.streams;
DROP POLICY IF EXISTS "Scholars can create streams" ON public.streams;
DROP POLICY IF EXISTS "Scholars can insert own streams" ON public.streams;
DROP POLICY IF EXISTS "Scholars can update own streams" ON public.streams;

-- Enable RLS on streams table
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view active streams
CREATE POLICY "Anyone can view active streams"
ON public.streams
FOR SELECT
USING (is_active = true);

-- Policy 2: Scholars/Imams can view their own streams (active or not)
CREATE POLICY "Scholars can view own streams"
ON public.streams
FOR SELECT
USING (auth.uid() = scholar_id);

-- Policy 3: Scholars/Imams can create streams
CREATE POLICY "Scholars can create streams"
ON public.streams
FOR INSERT
WITH CHECK (
  auth.uid() = scholar_id AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('scholar', 'imam')
  )
);

-- Policy 4: Scholars/Imams can update their own streams
CREATE POLICY "Scholars can update own streams"
ON public.streams
FOR UPDATE
USING (auth.uid() = scholar_id)
WITH CHECK (auth.uid() = scholar_id);

-- Policy 5: Scholars/Imams can delete their own streams
CREATE POLICY "Scholars can delete own streams"
ON public.streams
FOR DELETE
USING (auth.uid() = scholar_id);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'streams'
ORDER BY policyname;

-- Test: Try to select active streams (should work for anyone)
SELECT id, title, channel_name, scholar_id, is_active, started_at 
FROM streams 
WHERE is_active = true;
