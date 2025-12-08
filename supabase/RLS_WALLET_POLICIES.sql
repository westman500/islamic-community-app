-- =========================================================================
-- RLS: Wallet visibility for profiles and masjid_coin_transactions
-- =========================================================================

-- Allow users to read their own profile (for balance)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='read own profile'
    ) THEN
      CREATE POLICY "read own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id);
    END IF;
  END IF;
END $$;

-- Allow all authenticated users to read scholar/imam profiles (for booking)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='read scholar profiles'
    ) THEN
      CREATE POLICY "read scholar profiles" ON public.profiles
        FOR SELECT USING (
          auth.role() = 'authenticated' AND role IN ('scholar', 'imam')
        );
    END IF;
  END IF;
END $$;

-- Allow users to read their own transactions (as sender or recipient)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='masjid_coin_transactions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='masjid_coin_transactions' AND policyname='read own transactions'
    ) THEN
      CREATE POLICY "read own transactions" ON public.masjid_coin_transactions
        FOR SELECT USING (auth.uid() = user_id OR auth.uid() = recipient_id);
    END IF;
  END IF;
END $$;

-- Ensure tables are included in realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='masjid_coin_transactions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='masjid_coin_transactions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.masjid_coin_transactions;
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
  END IF;
END $$;
