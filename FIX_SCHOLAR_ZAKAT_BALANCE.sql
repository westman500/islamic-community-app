-- ============================================================================
-- FIX SCHOLAR BALANCE NOT UPDATING WITH ZAKAT
-- ============================================================================

-- Issue: Scholar balances get stuck because manual balance updates in frontend
-- conflict with database triggers, or triggers aren't firing correctly.

-- Solution: Ensure trigger works correctly and recalculate all balances

-- ============================================================================
-- STEP 1: Drop and recreate trigger with better logic
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_balance_on_transaction ON masjid_coin_transactions;
DROP FUNCTION IF EXISTS update_profile_balance_on_transaction();

-- Create improved function that handles both positive and negative amounts correctly
CREATE OR REPLACE FUNCTION update_profile_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed/success transactions
    IF NEW.payment_status IN ('completed', 'success') THEN
        
        -- For POSITIVE amounts: Credit the recipient
        IF NEW.recipient_id IS NOT NULL AND NEW.amount > 0 THEN
            UPDATE profiles
            SET masjid_coin_balance = COALESCE(masjid_coin_balance, 0) + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.recipient_id;
            
            RAISE NOTICE '✅ Credited recipient % with +% coins', NEW.recipient_id, NEW.amount;
        END IF;
        
        -- For NEGATIVE amounts: Debit the sender
        IF NEW.user_id IS NOT NULL AND NEW.amount < 0 THEN
            UPDATE profiles
            SET masjid_coin_balance = COALESCE(masjid_coin_balance, 0) + NEW.amount,  -- amount is negative
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
            RAISE NOTICE '✅ Debited sender % with % coins', NEW.user_id, NEW.amount;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_update_balance_on_transaction
    AFTER INSERT ON masjid_coin_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_balance_on_transaction();

-- ============================================================================
-- STEP 2: Recalculate ALL scholar/imam balances from transactions
-- ============================================================================

-- Reset all scholar balances to 0 first
UPDATE profiles
SET masjid_coin_balance = 0,
    updated_at = NOW()
WHERE role IN ('scholar', 'imam');

-- Recalculate each scholar's balance based on completed transactions
DO $$
DECLARE
    scholar_record RECORD;
    calculated_balance DECIMAL(10,2);
BEGIN
    FOR scholar_record IN 
        SELECT id, full_name, email, role 
        FROM profiles 
        WHERE role IN ('scholar', 'imam')
    LOOP
        -- Calculate correct balance from all completed transactions
        SELECT COALESCE(SUM(
            CASE 
                -- Income: positive amounts where they are recipient
                WHEN t.recipient_id = scholar_record.id 
                     AND t.payment_status IN ('completed', 'success')
                     AND t.amount > 0
                THEN t.amount
                -- Expenses: negative amounts where they are user (withdrawals)
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
        SET masjid_coin_balance = calculated_balance,
            updated_at = NOW()
        WHERE id = scholar_record.id;
        
        RAISE NOTICE '✅ Recalculated balance for % (%): % coins (₦%)', 
                     scholar_record.full_name, 
                     scholar_record.email,
                     calculated_balance,
                     calculated_balance * 100;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Verify balances
-- ============================================================================

-- Show all scholars with their recalculated balances
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.masjid_coin_balance as current_balance_coins,
    (p.masjid_coin_balance * 100) as current_balance_naira,
    -- Calculate what it should be from transactions
    COALESCE(SUM(
        CASE 
            WHEN t.recipient_id = p.id AND t.payment_status IN ('completed', 'success') AND t.amount > 0 
            THEN t.amount
            WHEN t.user_id = p.id AND t.payment_status IN ('completed', 'success') AND t.amount < 0 
            THEN t.amount
            ELSE 0
        END
    ), 0) as calculated_from_transactions,
    CASE 
        WHEN p.masjid_coin_balance = COALESCE(SUM(
            CASE 
                WHEN t.recipient_id = p.id AND t.payment_status IN ('completed', 'success') AND t.amount > 0 
                THEN t.amount
                WHEN t.user_id = p.id AND t.payment_status IN ('completed', 'success') AND t.amount < 0 
                THEN t.amount
                ELSE 0
            END
        ), 0) 
        THEN '✅ CORRECT'
        ELSE '❌ MISMATCH'
    END as status
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON (t.recipient_id = p.id OR t.user_id = p.id)
WHERE p.role IN ('scholar', 'imam')
GROUP BY p.id, p.email, p.full_name, p.role, p.masjid_coin_balance
ORDER BY p.full_name;

-- ============================================================================
-- STEP 4: Show recent zakat/donation transactions
-- ============================================================================

SELECT 
    t.created_at,
    t.type,
    donor.full_name as donor,
    scholar.full_name as scholar,
    t.amount as amount_coins,
    (t.amount * 100) as amount_naira,
    t.payment_status,
    t.description
FROM masjid_coin_transactions t
LEFT JOIN profiles donor ON t.user_id = donor.id
LEFT JOIN profiles scholar ON t.recipient_id = scholar.id
WHERE t.type IN ('donation', 'zakat')
  AND t.created_at > NOW() - INTERVAL '30 days'
ORDER BY t.created_at DESC
LIMIT 20;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ SCHOLAR BALANCE FIX COMPLETE!' as status,
       'All scholar balances have been recalculated from transaction history' as message,
       'Trigger is now active for automatic future updates' as note;
