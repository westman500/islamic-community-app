-- Fix RLS for stream_reactions table to allow viewing and creating reactions

-- Enable RLS
ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view reactions" ON public.stream_reactions;
DROP POLICY IF EXISTS "Users can create reactions" ON public.stream_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.stream_reactions;

-- Allow all authenticated users to view reactions
CREATE POLICY "authenticated_users_view_reactions"
ON public.stream_reactions
FOR SELECT
TO authenticated
USING (true);

-- Allow users to create their own reactions
CREATE POLICY "users_create_own_reactions"
ON public.stream_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reactions
CREATE POLICY "users_delete_own_reactions"
ON public.stream_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'stream_reactions'
ORDER BY policyname;
