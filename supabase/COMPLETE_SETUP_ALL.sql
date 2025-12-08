-- =====================================================================
-- COMPLETE SETUP: All Tables + Scholar Accounts
-- Run this ONCE in Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- STEP 1: Create consultations table (fixes 404 error)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scholar_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at timestamptz,
  actual_ended_at timestamptz,
  scheduled_at timestamptz,
  status text DEFAULT 'pending',
  topic text,
  created_at timestamptz DEFAULT now()
);

-- RLS for consultations
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own consultations" ON public.consultations;
CREATE POLICY "Users can view own consultations" ON public.consultations
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = scholar_id);

DROP POLICY IF EXISTS "Users can create consultations" ON public.consultations;
CREATE POLICY "Users can create consultations" ON public.consultations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname='supabase_realtime' AND tablename='consultations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
  END IF;
END $$;

-- =====================================================================
-- STEP 2: Create masjid_coin_transactions table (for wallet)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.masjid_coin_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  type text, -- 'deposit', 'withdrawal', 'payment', 'refund'
  description text,
  payment_reference text,
  payment_status text DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  currency text DEFAULT 'NGN',
  note text,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Indexes for wallet queries
CREATE INDEX IF NOT EXISTS masjid_coin_transactions_user_id_idx ON public.masjid_coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS masjid_coin_transactions_recipient_id_idx ON public.masjid_coin_transactions(recipient_id);
CREATE INDEX IF NOT EXISTS masjid_coin_transactions_created_at_idx ON public.masjid_coin_transactions(created_at DESC);

-- RLS for wallet transactions
ALTER TABLE public.masjid_coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.masjid_coin_transactions;
CREATE POLICY "Users can view own transactions" ON public.masjid_coin_transactions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can create transactions" ON public.masjid_coin_transactions;
CREATE POLICY "Users can create transactions" ON public.masjid_coin_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname='supabase_realtime' AND tablename='masjid_coin_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.masjid_coin_transactions;
  END IF;
END $$;

-- =====================================================================
-- STEP 3: Set up scholar accounts with fees
-- =====================================================================

-- Configure ssl4live@gmail.com as scholar
UPDATE profiles 
SET 
  role = 'scholar',
  is_online = true,
  consultation_fee = 2500,
  livestream_fee = 5000,
  live_consultation_fee = 3000,
  full_name = COALESCE(full_name, 'Imam SSL4Live'),
  specializations = COALESCE(specializations, ARRAY['Islamic Studies']),
  bio = COALESCE(bio, 'Experienced Islamic scholar providing consultations and spiritual guidance'),
  available_slots = ARRAY['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
WHERE email = 'ssl4live@gmail.com';

-- Configure welshman221@gmail.com as scholar
UPDATE profiles 
SET 
  role = 'scholar',
  is_online = true,
  consultation_fee = 2500,
  livestream_fee = 5000,
  live_consultation_fee = 3000,
  full_name = COALESCE(full_name, 'Imam Welshman'),
  specializations = COALESCE(specializations, ARRAY['Islamic Studies']),
  bio = COALESCE(bio, 'Dedicated Islamic scholar offering guidance and consultation services'),
  available_slots = ARRAY['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
WHERE email = 'welshman221@gmail.com';

-- =====================================================================
-- STEP 4: Verification
-- =====================================================================

-- Show all scholars with fees
SELECT 
  email,
  full_name,
  role,
  is_online,
  consultation_fee,
  livestream_fee,
  specializations
FROM profiles 
WHERE role IN ('scholar', 'imam')
ORDER BY email;

-- Count bookable scholars
SELECT 
  COUNT(*) as total_scholars,
  COUNT(*) FILTER (WHERE is_online = true) as online_scholars,
  COUNT(*) FILTER (WHERE consultation_fee > 0) as scholars_with_fees
FROM profiles 
WHERE role IN ('scholar', 'imam');

-- Success message
SELECT '✅ All tables created and scholars configured! Refresh your app.' AS status;
