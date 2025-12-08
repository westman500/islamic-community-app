-- =====================================================================
-- Minimal schema for masjid_coin_transactions (wallet transactions)
-- Safe-guards to avoid errors if already present
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='masjid_coin_transactions'
  ) THEN
    CREATE TABLE public.masjid_coin_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      amount numeric(12,2) NOT NULL CHECK (amount >= 0),
      currency text NOT NULL DEFAULT 'NGN',
      note text,
      status text NOT NULL DEFAULT 'completed', -- e.g., pending|completed|failed
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Indexes (create only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='masjid_coin_transactions' AND indexname='masjid_coin_transactions_user_id_idx'
  ) THEN
    CREATE INDEX masjid_coin_transactions_user_id_idx ON public.masjid_coin_transactions(user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='masjid_coin_transactions' AND indexname='masjid_coin_transactions_recipient_id_idx'
  ) THEN
    CREATE INDEX masjid_coin_transactions_recipient_id_idx ON public.masjid_coin_transactions(recipient_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='masjid_coin_transactions' AND indexname='masjid_coin_transactions_created_at_idx'
  ) THEN
    CREATE INDEX masjid_coin_transactions_created_at_idx ON public.masjid_coin_transactions(created_at);
  END IF;
END $$;

-- Enable RLS (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='masjid_coin_transactions'
  ) THEN
    EXECUTE 'ALTER TABLE public.masjid_coin_transactions ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Optional: Basic insert policy for privileged roles only (service role)
-- Commented out to avoid granting writes broadly; use Edge Functions with service role
-- CREATE POLICY "service can insert transactions" ON public.masjid_coin_transactions
--   FOR INSERT TO service_role USING (true) WITH CHECK (true);

-- Ensure realtime publication includes the table (if present)
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
END $$;
