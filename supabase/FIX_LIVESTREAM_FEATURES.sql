-- Fix Livestream Features: Viewer Count, Comments, Real-time Updates
-- Run this in Supabase SQL Editor

-- 1. Create stream_comments table for livestream chat
CREATE TABLE IF NOT EXISTS stream_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_comments_stream_id ON stream_comments(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_comments_created_at ON stream_comments(created_at DESC);

-- 3. Enable RLS on stream_comments
ALTER TABLE stream_comments ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for comments
DROP POLICY IF EXISTS "Anyone can view stream comments" ON stream_comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON stream_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON stream_comments;

CREATE POLICY "Anyone can view stream comments"
ON stream_comments FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own comments"
ON stream_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON stream_comments FOR DELETE
USING (auth.uid() = user_id);

-- 5. Create function to update viewer count when user joins
CREATE OR REPLACE FUNCTION increment_viewer_count(stream_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE streams
  SET viewer_count = COALESCE(viewer_count, 0) + 1,
      updated_at = NOW()
  WHERE id = stream_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to decrease viewer count when user leaves
CREATE OR REPLACE FUNCTION decrement_viewer_count(stream_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE streams
  SET viewer_count = GREATEST(COALESCE(viewer_count, 1) - 1, 0),
      updated_at = NOW()
  WHERE id = stream_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_viewer_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_viewer_count(UUID) TO authenticated;

-- 8. Add updated_at column to streams if not exists
ALTER TABLE streams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 9. Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_streams_updated_at ON streams;
CREATE TRIGGER update_streams_updated_at
  BEFORE UPDATE ON streams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Verify setup
SELECT 'Livestream features ready: comments table, viewer count functions, real-time triggers!' as status;

-- Show existing streams
SELECT id, channel, title, viewer_count, likes_count, dislikes_count 
FROM streams 
WHERE is_live = true 
LIMIT 5;
