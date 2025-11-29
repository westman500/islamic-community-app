-- Create stream_reactions table for like/dislike functionality

-- Create table
CREATE TABLE IF NOT EXISTS public.stream_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID REFERENCES public.streams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stream_id, user_id) -- One reaction per user per stream
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stream_reactions_stream_id ON public.stream_reactions(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_reactions_user_id ON public.stream_reactions(user_id);

-- Enable RLS
ALTER TABLE public.stream_reactions ENABLE ROW LEVEL SECURITY;

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

-- Verify table and policies
SELECT 'Table created successfully' as status;

SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'stream_reactions'
ORDER BY policyname;
