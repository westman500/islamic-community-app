-- =====================================================================
-- COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor to set up all missing columns and features
-- This combines: Scholar columns, Wallet balance, RLS policies
-- =====================================================================

-- =====================================================================
-- STEP 1: Add missing columns to profiles table
-- =====================================================================

-- Add masjid_coin_balance column (for wallet balance)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='masjid_coin_balance'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN masjid_coin_balance numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add is_online column (for availability status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='is_online'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN is_online boolean DEFAULT false;
  END IF;
END $$;

-- Add consultation_fee column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='consultation_fee'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN consultation_fee numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add livestream_fee column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='livestream_fee'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN livestream_fee numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add live_consultation_fee column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='live_consultation_fee'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN live_consultation_fee numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add available_slots column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='available_slots'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN available_slots text[] DEFAULT ARRAY['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  END IF;
END $$;

-- =====================================================================
-- STEP 2: Create performance indexes
-- =====================================================================

-- Index on is_online for faster availability queries
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles(is_online) WHERE is_online = true;

-- Index on role and consultation_fee for scholar listing queries
CREATE INDEX IF NOT EXISTS profiles_role_consultation_fee_idx ON public.profiles(role, consultation_fee) WHERE role IN ('scholar', 'imam');

-- =====================================================================
-- STEP 3: Ensure RLS policies are in place
-- =====================================================================

-- Allow users to read their own profile (for balance)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='read own profile'
  ) THEN
    CREATE POLICY "read own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- Allow all authenticated users to read scholar/imam profiles (for booking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='read scholar profiles'
  ) THEN
    CREATE POLICY "read scholar profiles" ON public.profiles
      FOR SELECT USING (
        auth.role() = 'authenticated' AND role IN ('scholar', 'imam')
      );
  END IF;
END $$;

-- =====================================================================
-- STEP 4: Verification queries
-- =====================================================================

-- Show all profiles with new columns (limit 5 for readability)
SELECT id, email, role, 
       masjid_coin_balance, 
       is_online, 
       consultation_fee, 
       livestream_fee,
       live_consultation_fee
FROM public.profiles 
LIMIT 5;

-- Count scholars/imams with fees set
SELECT 
  COUNT(*) FILTER (WHERE consultation_fee > 0) AS scholars_with_fees,
  COUNT(*) AS total_scholars
FROM public.profiles 
WHERE role IN ('scholar', 'imam');

-- Success message
SELECT 'Database setup complete! ✅' AS status;
