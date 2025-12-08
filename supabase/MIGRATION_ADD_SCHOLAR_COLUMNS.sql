-- =====================================================================
-- Add missing columns to profiles table for scholar availability, pricing, and wallet
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

-- Add consultation_fee column (if missing)
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

-- Add livestream_fee column (if missing)
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

-- Add live_consultation_fee column (if missing)
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

-- Add available_slots column (if missing)
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

-- Create index on is_online for faster queries
CREATE INDEX IF NOT EXISTS profiles_is_online_idx ON public.profiles(is_online) WHERE is_online = true;

-- Create index on role and consultation_fee for scholar queries
CREATE INDEX IF NOT EXISTS profiles_role_consultation_fee_idx ON public.profiles(role, consultation_fee) WHERE role IN ('scholar', 'imam');
