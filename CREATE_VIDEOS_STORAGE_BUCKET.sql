-- CREATE VIDEOS STORAGE BUCKET FOR ISLAMIC REELS
-- Run this in Supabase SQL Editor to create the videos bucket with proper permissions

-- Create the videos bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    true,
    524288000, -- 500 MB max file size
    ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Allow authenticated users to update their own videos
CREATE POLICY "Users can update own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own videos
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow everyone to view videos (public bucket)
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');
