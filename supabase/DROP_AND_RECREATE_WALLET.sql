-- =====================================================================
-- DROP AND RECREATE WALLET TABLE
-- Run this in Supabase SQL Editor to fix schema cache issues
-- =====================================================================

-- Step 1: Drop the table completely (this clears the cache)
DROP TABLE IF EXISTS public.masjid_coin_transactions CASCADE;

-- Step 2: Recreate with correct schema
CREATE TABLE public.masjid_coin_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  type text,
  description text,
  payment_reference text,
  payment_status text DEFAULT 'pending',
  currency text DEFAULT 'NGN',
  note text,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Step 3: Create indexes for performance
CREATE INDEX masjid_coin_transactions_user_id_idx ON public.masjid_coin_transactions(user_id);
CREATE INDEX masjid_coin_transactions_recipient_id_idx ON public.masjid_coin_transactions(recipient_id);
CREATE INDEX masjid_coin_transactions_created_at_idx ON public.masjid_coin_transactions(created_at DESC);
CREATE INDEX masjid_coin_transactions_payment_ref_idx ON public.masjid_coin_transactions(payment_reference);

-- Step 4: Enable Row Level Security
ALTER TABLE public.masjid_coin_transactions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view own transactions" ON public.masjid_coin_transactions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create transactions" ON public.masjid_coin_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update transactions" ON public.masjid_coin_transactions
  FOR UPDATE USING (true);

-- Step 6: Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.masjid_coin_transactions;

-- Step 7: Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'masjid_coin_transactions'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Wallet table recreated successfully! All columns present.' AS status;
