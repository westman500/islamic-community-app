-- =====================================================================
-- COMPLETE SETUP: REELS + PUSH NOTIFICATIONS + COIN REWARDS
-- Run this entire script in Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- PART 1: CREATE ISLAMIC REELS TABLES
-- =====================================================================

-- Create reels table
CREATE TABLE IF NOT EXISTS public.islamic_reels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  category text,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  dislikes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  favorites_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  is_approved boolean DEFAULT false,
  moderation_status text DEFAULT 'pending',
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

-- Create reels favorites table
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

-- Create content flags table
CREATE TABLE IF NOT EXISTS public.reel_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, reporter_id)
);

-- Enable RLS on reels tables
ALTER TABLE public.islamic_reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_dislikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for islamic_reels
DROP POLICY IF EXISTS "Anyone can view approved reels" ON public.islamic_reels;
CREATE POLICY "Anyone can view approved reels" ON public.islamic_reels
  FOR SELECT USING (is_approved = true AND is_active = true);

DROP POLICY IF EXISTS "Users can view own reels" ON public.islamic_reels;
CREATE POLICY "Users can view own reels" ON public.islamic_reels
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can upload reels" ON public.islamic_reels;
CREATE POLICY "Authenticated users can upload reels" ON public.islamic_reels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reels" ON public.islamic_reels;
CREATE POLICY "Users can update own reels" ON public.islamic_reels
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reels" ON public.islamic_reels;
CREATE POLICY "Users can delete own reels" ON public.islamic_reels
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reel_likes
DROP POLICY IF EXISTS "Users can view all likes" ON public.reel_likes;
CREATE POLICY "Users can view all likes" ON public.reel_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like reels" ON public.reel_likes;
CREATE POLICY "Users can like reels" ON public.reel_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike reels" ON public.reel_likes;
CREATE POLICY "Users can unlike reels" ON public.reel_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reel_dislikes
DROP POLICY IF EXISTS "Users can view all dislikes" ON public.reel_dislikes;
CREATE POLICY "Users can view all dislikes" ON public.reel_dislikes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can dislike reels" ON public.reel_dislikes;
CREATE POLICY "Users can dislike reels" ON public.reel_dislikes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove dislikes" ON public.reel_dislikes;
CREATE POLICY "Users can remove dislikes" ON public.reel_dislikes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reel_favorites
DROP POLICY IF EXISTS "Users can view their favorites" ON public.reel_favorites;
CREATE POLICY "Users can view their favorites" ON public.reel_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can favorite reels" ON public.reel_favorites;
CREATE POLICY "Users can favorite reels" ON public.reel_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfavorite reels" ON public.reel_favorites;
CREATE POLICY "Users can unfavorite reels" ON public.reel_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reel_comments
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.reel_comments;
CREATE POLICY "Anyone can view approved comments" ON public.reel_comments
  FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Users can view own comments" ON public.reel_comments;
CREATE POLICY "Users can view own comments" ON public.reel_comments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can comment on reels" ON public.reel_comments;
CREATE POLICY "Users can comment on reels" ON public.reel_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.reel_comments;
CREATE POLICY "Users can delete own comments" ON public.reel_comments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for reel_flags
DROP POLICY IF EXISTS "Users can view own flags" ON public.reel_flags;
CREATE POLICY "Users can view own flags" ON public.reel_flags
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can flag reels" ON public.reel_flags;
CREATE POLICY "Users can flag reels" ON public.reel_flags
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- =====================================================================
-- PART 2: PUSH NOTIFICATIONS & COIN REWARDS
-- =====================================================================

-- Add push_token column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token text,
ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "reels": true,
  "consultations": true,
  "livestreams": true,
  "donations": true,
  "coin_rewards": true
}'::jsonb;

-- Create reel_views table to track unique views
CREATE TABLE IF NOT EXISTS public.reel_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  watched_duration_seconds integer DEFAULT 0,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

-- Create reel_rewards table to track coin rewards given
CREATE TABLE IF NOT EXISTS public.reel_rewards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_views integer NOT NULL,
  coins_awarded integer NOT NULL,
  transaction_id uuid REFERENCES public.masjid_coin_transactions(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, milestone_views)
);

-- Create notification_logs table to track all notifications sent
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  sent_at timestamptz DEFAULT now(),
  delivered boolean DEFAULT false,
  opened boolean DEFAULT false,
  opened_at timestamptz
);

-- Enable RLS on new tables
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reel_views
DROP POLICY IF EXISTS "Anyone can view reel views" ON public.reel_views;
CREATE POLICY "Anyone can view reel views" ON public.reel_views
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reel views" ON public.reel_views;
CREATE POLICY "Authenticated users can insert reel views" ON public.reel_views
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- RLS Policies for reel_rewards
DROP POLICY IF EXISTS "Users can view their own rewards" ON public.reel_rewards;
CREATE POLICY "Users can view their own rewards" ON public.reel_rewards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert rewards" ON public.reel_rewards;
CREATE POLICY "System can insert rewards" ON public.reel_rewards
  FOR INSERT WITH CHECK (true);

-- RLS Policies for notification_logs
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notification_logs;
CREATE POLICY "Users can view their own notifications" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_logs;
CREATE POLICY "System can insert notifications" ON public.notification_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================================
-- PART 3: FUNCTIONS AND TRIGGERS
-- =====================================================================

-- Function: Auto-reward coins when reel reaches view milestones
CREATE OR REPLACE FUNCTION public.check_reel_view_milestone()
RETURNS TRIGGER AS $$
DECLARE
  current_views integer;
  reel_owner_id uuid;
  milestone integer;
  coins_to_award integer;
  transaction_id uuid;
BEGIN
  -- Get current view count for this reel
  SELECT views_count, user_id 
  INTO current_views, reel_owner_id
  FROM public.islamic_reels
  WHERE id = NEW.reel_id;

  -- Check if we've hit the 100-view milestone
  IF current_views >= 100 THEN
    milestone := 100;
    coins_to_award := 10;

    IF NOT EXISTS (
      SELECT 1 FROM public.reel_rewards 
      WHERE reel_id = NEW.reel_id AND milestone_views = milestone
    ) THEN
      UPDATE public.profiles
      SET masjid_coin_balance = masjid_coin_balance + coins_to_award
      WHERE id = reel_owner_id;

      INSERT INTO public.masjid_coin_transactions (
        user_id, amount, type, description, status, payment_status
      ) VALUES (
        reel_owner_id, coins_to_award, 'reel_reward',
        '10 coins reward for reaching 100 views on your reel',
        'completed', 'success'
      ) RETURNING id INTO transaction_id;

      INSERT INTO public.reel_rewards (
        reel_id, user_id, milestone_views, coins_awarded, transaction_id
      ) VALUES (
        NEW.reel_id, reel_owner_id, milestone, coins_to_award, transaction_id
      );

      INSERT INTO public.notification_logs (
        user_id, notification_type, title, body, data
      ) VALUES (
        reel_owner_id, 'coin_reward',
        '🎁 Coins Earned!',
        'You earned 10 coins! Your reel reached 100 views!',
        jsonb_build_object('coins', coins_to_award, 'milestone', milestone, 'reel_id', NEW.reel_id)
      );

      RAISE NOTICE '🎁 Awarded % coins to user % for % views', coins_to_award, reel_owner_id, milestone;
    END IF;
  END IF;

  -- Check for 500-view milestone
  IF current_views >= 500 THEN
    milestone := 500;
    coins_to_award := 50;
    
    IF NOT EXISTS (
      SELECT 1 FROM public.reel_rewards 
      WHERE reel_id = NEW.reel_id AND milestone_views = milestone
    ) THEN
      UPDATE public.profiles
      SET masjid_coin_balance = masjid_coin_balance + coins_to_award
      WHERE id = reel_owner_id;

      INSERT INTO public.masjid_coin_transactions (
        user_id, amount, type, description, status, payment_status
      ) VALUES (
        reel_owner_id, coins_to_award, 'reel_reward',
        '50 coins reward for reaching 500 views on your reel',
        'completed', 'success'
      ) RETURNING id INTO transaction_id;

      INSERT INTO public.reel_rewards (
        reel_id, user_id, milestone_views, coins_awarded, transaction_id
      ) VALUES (
        NEW.reel_id, reel_owner_id, milestone, coins_to_award, transaction_id
      );

      INSERT INTO public.notification_logs (
        user_id, notification_type, title, body, data
      ) VALUES (
        reel_owner_id, 'coin_reward',
        '🎁 Coins Earned!',
        'You earned 50 coins! Your reel reached 500 views!',
        jsonb_build_object('coins', coins_to_award, 'milestone', milestone, 'reel_id', NEW.reel_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_reel_milestone_trigger ON public.reel_views;

-- Create trigger to check for milestone rewards after each new view
CREATE TRIGGER check_reel_milestone_trigger
  AFTER INSERT ON public.reel_views
  FOR EACH ROW
  EXECUTE FUNCTION public.check_reel_view_milestone();

-- Function: Update views_count when new view is inserted
CREATE OR REPLACE FUNCTION public.increment_reel_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.islamic_reels
  SET views_count = views_count + 1,
      updated_at = now()
  WHERE id = NEW.reel_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS increment_reel_views_trigger ON public.reel_views;

-- Create trigger to auto-increment view count
CREATE TRIGGER increment_reel_views_trigger
  AFTER INSERT ON public.reel_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_reel_views();

-- =====================================================================
-- PART 4: UPDATE TRANSACTION TYPES
-- =====================================================================

DO $$ 
BEGIN
  ALTER TABLE public.masjid_coin_transactions 
    DROP CONSTRAINT IF EXISTS masjid_coin_transactions_type_check;
  
  ALTER TABLE public.masjid_coin_transactions
    ADD CONSTRAINT masjid_coin_transactions_type_check
    CHECK (type IN (
      'deposit', 
      'livestream', 
      'consultation', 
      'consultation_extension', 
      'donation', 
      'withdrawal',
      'reel_reward'
    ));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not update transaction type constraint: %', SQLERRM;
END $$;

-- =====================================================================
-- PART 5: CREATE INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_islamic_reels_user_id ON public.islamic_reels(user_id);
CREATE INDEX IF NOT EXISTS idx_islamic_reels_category ON public.islamic_reels(category);
CREATE INDEX IF NOT EXISTS idx_islamic_reels_created_at ON public.islamic_reels(created_at);
CREATE INDEX IF NOT EXISTS idx_islamic_reels_views_count ON public.islamic_reels(views_count);
CREATE INDEX IF NOT EXISTS idx_islamic_reels_moderation_status ON public.islamic_reels(moderation_status);

CREATE INDEX IF NOT EXISTS idx_reel_views_reel_id ON public.reel_views(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_user_id ON public.reel_views(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_created_at ON public.reel_views(created_at);

CREATE INDEX IF NOT EXISTS idx_reel_rewards_reel_id ON public.reel_rewards(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_rewards_user_id ON public.reel_rewards(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON public.notification_logs(notification_type);

CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON public.profiles(push_token);

CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON public.reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_dislikes_reel_id ON public.reel_dislikes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_favorites_user_id ON public.reel_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON public.reel_comments(reel_id);

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Complete setup finished successfully!';
  RAISE NOTICE '🎥 Islamic Reels tables created';
  RAISE NOTICE '📱 Push notifications configured';
  RAISE NOTICE '🎁 Coin reward system active (10 coins @ 100 views, 50 coins @ 500 views)';
  RAISE NOTICE '🔔 Ready for Android notifications with Masjid logo';
END $$;
