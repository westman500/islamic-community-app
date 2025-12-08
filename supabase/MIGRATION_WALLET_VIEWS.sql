-- =====================================================================
-- Wallet balance function + view to match UI expectations
-- Provides a simple per-user balance derived from transactions
-- Credits: amounts where user is recipient; Debits: amounts where user is sender
-- =====================================================================

-- Create balance function (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_wallet_balance'
  ) THEN
    CREATE FUNCTION public.get_wallet_balance(p_user_id uuid)
    RETURNS numeric AS $$
      SELECT COALESCE(
        (
          SELECT COALESCE(SUM(t.amount), 0)
          FROM public.masjid_coin_transactions t
          WHERE t.recipient_id = p_user_id AND t.status = 'completed'
        )
        - (
          SELECT COALESCE(SUM(t.amount), 0)
          FROM public.masjid_coin_transactions t
          WHERE t.user_id = p_user_id AND t.status = 'completed'
        ),
        0
      );
    $$ LANGUAGE sql STABLE;
  END IF;
END $$;

-- Create per-user balance view (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='user_wallet_balances'
  ) THEN
    CREATE VIEW public.user_wallet_balances AS
      SELECT p.id AS user_id,
             public.get_wallet_balance(p.id) AS balance,
             'NGN'::text AS currency
      FROM public.profiles p;
  END IF;
END $$;

-- Optional helpful index on profiles.id is typically already primary key
-- No RLS needed on view itself; selection governed by base table policies

-- Convenience: Add simple select policy for the view via a security definer wrapper if needed
-- For now, rely on existing policies (read own profile; read own transactions).
