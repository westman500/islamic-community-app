-- Add profile picture support and fix reels visibility
-- Run this in Supabase SQL Editor

-- 1. Add profile picture columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- 2. Create storage bucket for profile pictures (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 4. Set up RLS policies for avatars bucket
CREATE POLICY "Public avatars are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Auto-approve all pending reels (for testing)
UPDATE islamic_reels
SET is_approved = true,
    moderation_status = 'approved'
WHERE is_approved = false OR moderation_status = 'pending';

-- 6. Verify changes
SELECT COUNT(*) as total_approved_reels FROM islamic_reels WHERE is_approved = true;

SELECT COUNT(*) as profiles_count FROM profiles;

-- 7. Check if push_token column exists for notifications
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Success message
SELECT 'Profile pictures enabled and reels auto-approved!' as status;
