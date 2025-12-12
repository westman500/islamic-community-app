-- Fix: Automatically update scholar/imam balance when transactions are created
-- This ensures the masjid_coin_balance in profiles table stays in sync with transactions

-- Step 1: Create function to automatically update balance
CREATE OR REPLACE FUNCTION update_profile_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed transactions
    IF NEW.payment_status = 'completed' OR NEW.payment_status = 'success' THEN
        
        -- Update recipient's balance (for positive amounts - income)
        IF NEW.recipient_id IS NOT NULL AND NEW.amount > 0 THEN
            UPDATE profiles
            SET masjid_coin_balance = masjid_coin_balance + NEW.amount
            WHERE id = NEW.recipient_id;
            
            RAISE NOTICE 'Updated recipient % balance by +% coins', NEW.recipient_id, NEW.amount;
        END IF;
        
        -- Update sender's balance (for negative amounts - debit)
        IF NEW.user_id IS NOT NULL AND NEW.amount < 0 THEN
            UPDATE profiles
            SET masjid_coin_balance = masjid_coin_balance + NEW.amount  -- amount is negative, so this subtracts
            WHERE id = NEW.user_id;
            
            RAISE NOTICE 'Updated sender % balance by % coins', NEW.user_id, NEW.amount;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger to run on transaction insert
DROP TRIGGER IF EXISTS trigger_update_balance_on_transaction ON masjid_coin_transactions;
CREATE TRIGGER trigger_update_balance_on_transaction
    AFTER INSERT ON masjid_coin_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_balance_on_transaction();

-- Step 3: Recalculate all scholar/imam balances based on existing transactions
-- This fixes any past discrepancies

-- First, get all scholars and imams
DO $$
DECLARE
    scholar_record RECORD;
    calculated_balance INTEGER;
BEGIN
    FOR scholar_record IN 
        SELECT id, email, full_name, role, masjid_coin_balance as current_balance
        FROM profiles 
        WHERE role IN ('scholar', 'imam')
    LOOP
        -- Calculate what their balance should be based on transactions
        SELECT COALESCE(SUM(
            CASE 
                -- Income: positive amounts where they are recipient
                WHEN t.recipient_id = scholar_record.id 
                     AND t.payment_status IN ('completed', 'success')
                     AND t.amount > 0
                THEN t.amount
                -- Expenses: negative amounts where they are user
                WHEN t.user_id = scholar_record.id 
                     AND t.payment_status IN ('completed', 'success')
                     AND t.amount < 0
                THEN t.amount
                ELSE 0
            END
        ), 0)
        INTO calculated_balance
        FROM masjid_coin_transactions t
        WHERE t.recipient_id = scholar_record.id 
           OR t.user_id = scholar_record.id;
        
        -- Update profile with correct balance
        UPDATE profiles
        SET masjid_coin_balance = calculated_balance
        WHERE id = scholar_record.id;
        
        RAISE NOTICE 'Scholar/Imam: % (%) - Old balance: % coins, New balance: % coins, Change: % coins', 
            scholar_record.full_name, 
            scholar_record.email,
            scholar_record.current_balance,
            calculated_balance,
            (calculated_balance - scholar_record.current_balance);
    END LOOP;
END $$;

-- Step 4: Verify the fix for ssl4live@gmail.com specifically
SELECT 
    'AFTER FIX' as status,
    email,
    full_name,
    role,
    masjid_coin_balance as balance_coins,
    (masjid_coin_balance * 100) as balance_naira
FROM profiles
WHERE email = 'ssl4live@gmail.com';

-- Step 5: Show recent transactions for verification
SELECT 
    'Recent Transactions' as info,
    t.created_at,
    t.type,
    t.amount as amount_coins,
    (t.amount * 100) as amount_naira,
    t.payment_status,
    CASE 
        WHEN t.recipient_id = p.id THEN 'INCOME'
        WHEN t.user_id = p.id AND t.amount < 0 THEN 'EXPENSE'
        ELSE 'OTHER'
    END as transaction_type
FROM masjid_coin_transactions t
CROSS JOIN profiles p
WHERE p.email = 'ssl4live@gmail.com'
  AND (t.recipient_id = p.id OR t.user_id = p.id)
  AND t.payment_status IN ('completed', 'success')
ORDER BY t.created_at DESC
LIMIT 10;
