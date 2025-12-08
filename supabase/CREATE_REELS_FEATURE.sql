-- =====================================================================
-- ISLAMIC REELS FEATURE - Short Video Content
-- Run this in Supabase SQL Editor
-- =====================================================================

-- Create reels table
CREATE TABLE IF NOT EXISTS public.islamic_reels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer, -- Video length in seconds
  category text, -- 'quran_recitation', 'dua', 'islamic_reminder', 'halal_food', 'travel', 'education', 'lifestyle'
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  dislikes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  favorites_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  is_approved boolean DEFAULT false, -- Requires moderation approval
  moderation_status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'flagged'
  moderation_notes text,
  moderated_by uuid REFERENCES public.profiles(id),
  moderated_at timestamptz,
  flagged_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reels likes table
CREATE TABLE IF NOT EXISTS public.reel_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Create reels dislikes table
CREATE TABLE IF NOT EXISTS public.reel_dislikes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Create reels favorites table (save for later)
CREATE TABLE IF NOT EXISTS public.reel_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Create reels comments table
CREATE TABLE IF NOT EXISTS public.reel_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create content flags table (for reporting inappropriate content)
CREATE TABLE IF NOT EXISTS public.reel_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL, -- 'explicit_content', 'harassment', 'spam', 'misinformation', 'other'
  description text,
  status text DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, reporter_id) -- One flag per user per reel
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Islamic Reels Policies
ALTER TABLE public.islamic_reels ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved reels
CREATE POLICY "Anyone can view approved reels" ON public.islamic_reels
  FOR SELECT USING (is_approved = true AND is_active = true);

-- Users can view their own reels (regardless of approval status)
CREATE POLICY "Users can view own reels" ON public.islamic_reels
  FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can upload reels (pending approval)
CREATE POLICY "Users can upload reels" ON public.islamic_reels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending reels
CREATE POLICY "Users can update own pending reels" ON public.islamic_reels
  FOR UPDATE USING (auth.uid() = user_id AND moderation_status = 'pending');

-- Users can delete their own reels
CREATE POLICY "Users can delete own reels" ON public.islamic_reels
  FOR DELETE USING (auth.uid() = user_id);

-- Admins/Scholars can moderate reels
CREATE POLICY "Admins can moderate all reels" ON public.islamic_reels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'scholar', 'imam')
    )
  );

-- Reel Likes Policies
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.reel_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like reels" ON public.reel_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike reels" ON public.reel_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Reel Dislikes Policies
ALTER TABLE public.reel_dislikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dislikes" ON public.reel_dislikes
  FOR SELECT USING (true);

CREATE POLICY "Users can dislike reels" ON public.reel_dislikes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove dislike" ON public.reel_dislikes
  FOR DELETE USING (auth.uid() = user_id);

-- Reel Favorites Policies
ALTER TABLE public.reel_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON public.reel_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can favorite reels" ON public.reel_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfavorite reels" ON public.reel_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Reel Comments Policies
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved comments" ON public.reel_comments
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can comment on reels" ON public.reel_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.reel_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Reel Flags Policies
ALTER TABLE public.reel_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can flag inappropriate reels" ON public.reel_flags
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all flags" ON public.reel_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'scholar', 'imam')
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX islamic_reels_user_id_idx ON public.islamic_reels(user_id);
CREATE INDEX islamic_reels_approved_idx ON public.islamic_reels(is_approved, is_active);
CREATE INDEX islamic_reels_category_idx ON public.islamic_reels(category);
CREATE INDEX islamic_reels_created_at_idx ON public.islamic_reels(created_at DESC);
CREATE INDEX islamic_reels_moderation_status_idx ON public.islamic_reels(moderation_status);

CREATE INDEX reel_likes_reel_id_idx ON public.reel_likes(reel_id);
CREATE INDEX reel_likes_user_id_idx ON public.reel_likes(user_id);

CREATE INDEX reel_dislikes_reel_id_idx ON public.reel_dislikes(reel_id);
CREATE INDEX reel_dislikes_user_id_idx ON public.reel_dislikes(user_id);

CREATE INDEX reel_favorites_reel_id_idx ON public.reel_favorites(reel_id);
CREATE INDEX reel_favorites_user_id_idx ON public.reel_favorites(user_id);

CREATE INDEX reel_comments_reel_id_idx ON public.reel_comments(reel_id);
CREATE INDEX reel_comments_user_id_idx ON public.reel_comments(user_id);

CREATE INDEX reel_flags_reel_id_idx ON public.reel_flags(reel_id);
CREATE INDEX reel_flags_status_idx ON public.reel_flags(status);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update likes count
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.islamic_reels
    SET likes_count = likes_count + 1
    WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.islamic_reels
    SET likes_count = likes_count - 1
    WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reel_likes_count_trigger
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

-- Auto-update dislikes count
CREATE OR REPLACE FUNCTION update_reel_dislikes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.islamic_reels
    SET dislikes_count = dislikes_count + 1
    WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.islamic_reels
    SET dislikes_count = dislikes_count - 1
    WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reel_dislikes_count_trigger
AFTER INSERT OR DELETE ON public.reel_dislikes
FOR EACH ROW EXECUTE FUNCTION update_reel_dislikes_count();

-- Auto-update favorites count
CREATE OR REPLACE FUNCTION update_reel_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.islamic_reels
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.islamic_reels
    SET favorites_count = favorites_count - 1
    WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reel_favorites_count_trigger
AFTER INSERT OR DELETE ON public.reel_favorites
FOR EACH ROW EXECUTE FUNCTION update_reel_favorites_count();

-- Auto-update comments count
CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.islamic_reels
    SET comments_count = comments_count + 1
    WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.islamic_reels
    SET comments_count = comments_count - 1
    WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reel_comments_count_trigger
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION update_reel_comments_count();

-- Auto-update flagged count
CREATE OR REPLACE FUNCTION update_reel_flags_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.islamic_reels
    SET flagged_count = flagged_count + 1,
        moderation_status = CASE 
          WHEN flagged_count + 1 >= 3 THEN 'flagged' 
          ELSE moderation_status 
        END
    WHERE id = NEW.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reel_flags_count_trigger
AFTER INSERT ON public.reel_flags
FOR EACH ROW EXECUTE FUNCTION update_reel_flags_count();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to increment views count
CREATE OR REPLACE FUNCTION increment_reel_views(reel_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.islamic_reels
  SET views_count = views_count + 1
  WHERE id = reel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.islamic_reels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_dislikes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;

-- ============================================
-- INSERT DEMO REELS (PRE-APPROVED)
-- ============================================

-- Note: You'll need to replace user_id with actual user IDs from your profiles table
-- For now, these are placeholders

INSERT INTO public.islamic_reels (title, description, video_url, thumbnail_url, duration_seconds, category, is_approved, moderation_status, views_count, likes_count) VALUES
('Beautiful Quran Recitation - Surah Rahman', 'Mashallah! Listen to this beautiful recitation of Surah Ar-Rahman', 'https://example.com/videos/quran1.mp4', 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800', 180, 'quran_recitation', true, 'approved', 1500, 234),
('Morning Dua for Protection', 'Start your day with this powerful morning dua', 'https://example.com/videos/dua1.mp4', 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=800', 45, 'dua', true, 'approved', 2300, 567),
('How to Make Perfect Samosas', 'Halal cooking: Traditional samosas recipe for iftar', 'https://example.com/videos/food1.mp4', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 120, 'halal_food', true, 'approved', 890, 123),
('Islamic Reminder: Importance of Salah', 'Quick reminder about the 5 daily prayers', 'https://example.com/videos/reminder1.mp4', 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800', 60, 'islamic_reminder', true, 'approved', 3400, 890),
('Visiting Masjid Al-Haram - Makkah', 'Travel vlog from Umrah journey', 'https://example.com/videos/travel1.mp4', 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800', 240, 'travel', true, 'approved', 5600, 1200);

-- Success message
SELECT '✅ Islamic Reels feature setup complete!' AS status,
       'Content moderation enabled - all new reels require approval' AS note;
