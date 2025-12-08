-- =====================================================================
-- INITIALIZE USER WALLETS
-- Ensures all users have wallet balance initialized and set to 0 if NULL
-- =====================================================================

-- Step 1: Update all NULL wallet balances to 0
UPDATE public.profiles
SET masjid_coin_balance = 0
WHERE masjid_coin_balance IS NULL;

-- Step 2: Verify wallet initialization
SELECT 
  id,
  email,
  full_name,
  role,
  COALESCE(masjid_coin_balance, 0) as wallet_balance,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- Step 3: Check for users with pending deposits but zero balance
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.masjid_coin_balance as current_balance,
  COUNT(t.id) as pending_deposits,
  SUM(t.amount) as pending_amount
FROM public.profiles p
LEFT JOIN public.masjid_coin_transactions t 
  ON t.user_id = p.id 
  AND t.type = 'deposit'
  AND t.payment_status = 'pending'
GROUP BY p.id, p.email, p.full_name, p.masjid_coin_balance
HAVING COUNT(t.id) > 0;

-- Step 4: Create a trigger to ensure new users get initialized wallets
-- This trigger automatically sets wallet balance to 0 for new users
CREATE OR REPLACE FUNCTION initialize_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Set wallet balance to 0 if it's NULL
  IF NEW.masjid_coin_balance IS NULL THEN
    NEW.masjid_coin_balance := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS ensure_wallet_initialized ON public.profiles;

-- Create trigger for INSERT operations
CREATE TRIGGER ensure_wallet_initialized
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_wallet();

-- Step 5: Summary statistics
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM public.profiles
UNION ALL
SELECT 
  'Users with Wallet Balance > 0' as metric,
  COUNT(*) as count
FROM public.profiles
WHERE masjid_coin_balance > 0
UNION ALL
SELECT 
  'Users with NULL Wallet Balance' as metric,
  COUNT(*) as count
FROM public.profiles
WHERE masjid_coin_balance IS NULL;

-- Success message
SELECT '✅ User wallets initialized successfully!' AS status;
