-- =====================================================================
-- PUSH NOTIFICATIONS & REEL COIN REWARDS
-- Add push notification support and automatic coin rewards for reels
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
  ip_address text, -- Track anonymous views
  user_agent text,
  watched_duration_seconds integer DEFAULT 0,
  completed boolean DEFAULT false, -- Watched at least 80% of the reel
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, user_id) -- One view per user per reel
);

-- Create reel_rewards table to track coin rewards given
CREATE TABLE IF NOT EXISTS public.reel_rewards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES public.islamic_reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_views integer NOT NULL, -- e.g., 100, 500, 1000
  coins_awarded integer NOT NULL,
  transaction_id uuid REFERENCES public.masjid_coin_transactions(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(reel_id, milestone_views) -- One reward per milestone per reel
);

-- Create notification_logs table to track all notifications sent
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL, -- 'reel_upload', 'reel_trending', 'coin_reward', etc.
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
CREATE POLICY "Anyone can view reel views" ON public.reel_views
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert reel views" ON public.reel_views
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- RLS Policies for reel_rewards
CREATE POLICY "Users can view their own rewards" ON public.reel_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert rewards" ON public.reel_rewards
  FOR INSERT WITH CHECK (true);

-- RLS Policies for notification_logs
CREATE POLICY "Users can view their own notifications" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notification_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================================
-- FUNCTION: Auto-reward coins when reel reaches view milestones
-- =====================================================================

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

    -- Check if reward hasn't been given yet
    IF NOT EXISTS (
      SELECT 1 FROM public.reel_rewards 
      WHERE reel_id = NEW.reel_id AND milestone_views = milestone
    ) THEN
      -- Credit coins to user's balance
      UPDATE public.profiles
      SET masjid_coin_balance = masjid_coin_balance + coins_to_award
      WHERE id = reel_owner_id;

      -- Create transaction record
      INSERT INTO public.masjid_coin_transactions (
        user_id,
        amount,
        type,
        description,
        status,
        payment_status
      ) VALUES (
        reel_owner_id,
        coins_to_award,
        'reel_reward',
        '10 coins reward for reaching 100 views on your reel',
        'completed',
        'success'
      ) RETURNING id INTO transaction_id;

      -- Record the reward
      INSERT INTO public.reel_rewards (
        reel_id,
        user_id,
        milestone_views,
        coins_awarded,
        transaction_id
      ) VALUES (
        NEW.reel_id,
        reel_owner_id,
        milestone,
        coins_to_award,
        transaction_id
      );

      -- Log notification (will be sent by app)
      INSERT INTO public.notification_logs (
        user_id,
        notification_type,
        title,
        body,
        data
      ) VALUES (
        reel_owner_id,
        'coin_reward',
        '🎁 Coins Earned!',
        'You earned 10 coins! Your reel reached 100 views!',
        jsonb_build_object(
          'coins', coins_to_award,
          'milestone', milestone,
          'reel_id', NEW.reel_id
        )
      );

      RAISE NOTICE '🎁 Awarded % coins to user % for % views', coins_to_award, reel_owner_id, milestone;
    END IF;
  END IF;

  -- Check for higher milestones (500, 1000, 5000, 10000)
  -- You can extend this logic for more milestones
  IF current_views >= 500 THEN
    milestone := 500;
    coins_to_award := 50;
    
    IF NOT EXISTS (
      SELECT 1 FROM public.reel_rewards 
      WHERE reel_id = NEW.reel_id AND milestone_views = milestone
    ) THEN
      -- Repeat reward logic (same as above)
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

-- Create trigger to check for milestone rewards after each new view
CREATE TRIGGER check_reel_milestone_trigger
  AFTER INSERT ON public.reel_views
  FOR EACH ROW
  EXECUTE FUNCTION public.check_reel_view_milestone();

-- =====================================================================
-- FUNCTION: Update views_count when new view is inserted
-- =====================================================================

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

-- Create trigger to auto-increment view count
CREATE TRIGGER increment_reel_views_trigger
  AFTER INSERT ON public.reel_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_reel_views();

-- =====================================================================
-- Add 'reel_reward' to allowed transaction types if needed
-- =====================================================================

-- Update masjid_coin_transactions type constraint (if exists)
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.masjid_coin_transactions 
    DROP CONSTRAINT IF EXISTS masjid_coin_transactions_type_check;
  
  -- Add new constraint with reel_reward type
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
-- Create indexes for performance
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_reel_views_reel_id ON public.reel_views(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_user_id ON public.reel_views(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_created_at ON public.reel_views(created_at);

CREATE INDEX IF NOT EXISTS idx_reel_rewards_reel_id ON public.reel_rewards(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_rewards_user_id ON public.reel_rewards(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON public.notification_logs(notification_type);

CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON public.profiles(push_token);

-- =====================================================================
-- Success message
-- =====================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Push notifications and reel rewards system installed successfully!';
  RAISE NOTICE '📱 Users will earn 10 coins at 100 views, 50 coins at 500 views';
  RAISE NOTICE '🔔 Push notifications ready for Android devices';
END $$;
