-- FIX SCHOLAR BALANCE FROM TRANSACTIONS
-- This script recalculates each scholar's balance based on their transaction history
-- Run this ONLY ONCE to fix balances for scholars who received zakat before the balance update bug was fixed

-- STEP 1: Check current scholar balances and transaction totals
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.masjid_coin_balance as current_balance_coins,
    (p.masjid_coin_balance * 100) as current_balance_naira,
    COALESCE(SUM(CASE WHEN t.type = 'donation' AND t.recipient_id = p.id THEN t.amount ELSE 0 END), 0) as total_zakat_received_coins,
    COALESCE(SUM(CASE WHEN t.type = 'consultation' AND t.recipient_id = p.id THEN t.amount ELSE 0 END), 0) as total_consultation_coins,
    COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.user_id = p.id THEN t.amount ELSE 0 END), 0) as total_withdrawn_coins,
    -- Calculate what the balance SHOULD be (withdrawals are already negative)
    COALESCE(SUM(CASE WHEN t.type = 'donation' AND t.recipient_id = p.id THEN t.amount ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.type = 'consultation' AND t.recipient_id = p.id THEN t.amount ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.user_id = p.id THEN t.amount ELSE 0 END), 0) as expected_balance_coins,
    -- Show the difference
    (COALESCE(SUM(CASE WHEN t.type = 'donation' AND t.recipient_id = p.id THEN t.amount ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.type = 'consultation' AND t.recipient_id = p.id THEN t.amount ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.user_id = p.id THEN t.amount ELSE 0 END), 0) - p.masjid_coin_balance) as difference_coins
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON (t.recipient_id = p.id OR t.user_id = p.id)
WHERE p.role IN ('scholar', 'imam')
    AND t.payment_status = 'completed'
GROUP BY p.id, p.full_name, p.role, p.masjid_coin_balance
ORDER BY p.full_name;

-- STEP 2: Update balances to match transaction history (UNCOMMENT TO RUN)
-- WARNING: This will overwrite current balances with calculated balances from transactions
/*
UPDATE profiles p
SET masjid_coin_balance = (
    SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'donation' AND t.recipient_id = p.id THEN t.amount ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN t.type = 'consultation' AND t.recipient_id = p.id THEN t.amount ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN t.type = 'withdrawal' AND t.user_id = p.id THEN t.amount ELSE 0 END), 0)
    FROM masjid_coin_transactions t
    WHERE (t.recipient_id = p.id OR t.user_id = p.id)
        AND t.payment_status = 'completed'
),
updated_at = NOW()
WHERE p.role IN ('scholar', 'imam');
*/

-- STEP 3: Verify the update (run after STEP 2)
/*
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.masjid_coin_balance as updated_balance_coins,
    (p.masjid_coin_balance * 100) as updated_balance_naira
FROM profiles p
WHERE p.role IN ('scholar', 'imam')
ORDER BY p.full_name;
*/
