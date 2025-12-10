-- ============================================================================
-- FIX SCHOLAR WALLET BALANCES
-- ============================================================================
-- This script recalculates scholar balances based on their transaction history
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: View current scholar balances
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.masjid_coin_balance as current_balance
FROM profiles p
WHERE p.role = 'scholar'
ORDER BY p.full_name;

-- Step 1.5: DIAGNOSTIC - Show ALL transactions for scholars to understand the data structure
SELECT 
    t.id,
    t.created_at,
    t.type,
    t.amount,
    t.amount * 100 as naira,
    t.user_id,
    t.recipient_id,
    t.description,
    CASE 
        WHEN t.user_id IN (SELECT id FROM profiles WHERE role = 'scholar') THEN 'Scholar is user_id'
        ELSE 'Scholar is NOT user_id'
    END as user_check,
    CASE 
        WHEN t.recipient_id IN (SELECT id FROM profiles WHERE role = 'scholar') THEN 'Scholar is recipient_id'
        ELSE 'Scholar is NOT recipient_id'
    END as recipient_check
FROM masjid_coin_transactions t
WHERE t.type IN ('donation', 'consultation', 'withdrawal')
    AND (
        t.user_id IN (SELECT id FROM profiles WHERE role = 'scholar')
        OR t.recipient_id IN (SELECT id FROM profiles WHERE role = 'scholar')
    )
ORDER BY t.created_at DESC;

-- Step 2: Calculate correct balances from transactions
-- This shows what the balance SHOULD be based on transaction history
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.masjid_coin_balance as current_balance,
    COALESCE(SUM(
        CASE 
            -- NEW structure: recipient_id = scholar for income
            WHEN t.recipient_id = p.id AND t.amount > 0 THEN t.amount
            -- OLD structure: user_id = scholar for income (positive amounts only)
            WHEN t.user_id = p.id AND t.recipient_id != p.id AND t.amount > 0 THEN t.amount
            -- Withdrawals: user_id = scholar AND recipient_id = scholar (negative)
            WHEN t.user_id = p.id AND t.recipient_id = p.id AND t.amount < 0 THEN t.amount
            ELSE 0
        END
    ), 0) as calculated_balance,
    COALESCE(SUM(
        CASE 
            WHEN t.recipient_id = p.id AND t.amount > 0 THEN t.amount
            WHEN t.user_id = p.id AND t.recipient_id != p.id AND t.amount > 0 THEN t.amount
            WHEN t.user_id = p.id AND t.recipient_id = p.id AND t.amount < 0 THEN t.amount
            ELSE 0
        END
    ), 0) - p.masjid_coin_balance as difference
FROM profiles p
LEFT JOIN masjid_coin_transactions t ON (
    t.recipient_id = p.id OR 
    t.user_id = p.id
)
WHERE p.role = 'scholar'
GROUP BY p.id, p.full_name, p.email, p.masjid_coin_balance
ORDER BY p.full_name;

-- Step 3: Fix all scholar balances based on transaction history
-- Simple approach: Sum all transactions where scholar is the recipient_id
UPDATE profiles p
SET masjid_coin_balance = COALESCE(
    (
        SELECT SUM(t.amount)
        FROM masjid_coin_transactions t
        WHERE t.recipient_id = p.id
          AND t.type IN ('donation', 'consultation', 'withdrawal')
    ),
    0
)
WHERE p.role = 'scholar';

-- Step 4: Verify the updated balances
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.masjid_coin_balance as updated_balance,
    p.masjid_coin_balance * 100 as balance_in_naira
FROM profiles p
WHERE p.role = 'scholar'
ORDER BY p.full_name;

-- Step 5: Show recent transactions for verification
SELECT 
    t.created_at,
    t.type,
    t.amount as amount_in_coins,
    t.amount * 100 as amount_in_naira,
    t.description,
    donor.full_name as from_user,
    recipient.full_name as to_user
FROM masjid_coin_transactions t
LEFT JOIN profiles donor ON t.user_id = donor.id
LEFT JOIN profiles recipient ON t.recipient_id = recipient.id
WHERE t.type IN ('donation', 'consultation', 'withdrawal')
ORDER BY t.created_at DESC
LIMIT 20;

-- ============================================================================
-- After running this script:
-- 1. Refresh your Scholar Wallet page
-- 2. The balance should now show the correct amount
-- 3. All past earnings (zakat + consultations) will be included
-- ============================================================================
