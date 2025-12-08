-- =====================================================================
-- COMPLETE FIX FOR USER: welshman221@gmail.com
-- Run this to convert your account to a scholar and see scholars in listing
-- =====================================================================

-- Step 1: Convert your account to scholar with full settings
UPDATE profiles 
SET 
  role = 'scholar',
  is_online = true,
  consultation_fee = 2500,
  livestream_fee = 5000,
  live_consultation_fee = 3000,
  specialization = COALESCE(specialization, 'Islamic Studies'),
  full_name = COALESCE(full_name, 'Imam Welshman'),
  bio = COALESCE(bio, 'Experienced Islamic scholar providing consultations and guidance'),
  available_slots = ARRAY['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']
WHERE email = 'welshman221@gmail.com' OR id = '553798e9-b306-408d-b7bf-9de1a9a084b3';

-- Step 2: Verify your scholar account
SELECT 
  email,
  full_name,
  role,
  is_online,
  consultation_fee,
  livestream_fee,
  live_consultation_fee,
  specialization
FROM profiles 
WHERE email = 'welshman221@gmail.com';

-- Step 3: Check all available scholars (you should see yourself)
SELECT 
  email,
  full_name,
  role,
  is_online,
  consultation_fee
FROM profiles 
WHERE role IN ('scholar', 'imam') 
  AND consultation_fee > 0
ORDER BY full_name;

-- Step 4: Create consultations table if it doesn't exist (fixing 404 error)
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

-- Add RLS for consultations
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own consultations" ON public.consultations
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = scholar_id);

CREATE POLICY IF NOT EXISTS "Users can create consultations" ON public.consultations
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

-- Success message
SELECT '✅ Account converted to scholar! Refresh app to see changes.' AS status;
