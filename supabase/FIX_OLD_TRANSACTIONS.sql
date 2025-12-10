-- ============================================================================
-- FIX OLD TRANSACTION RECORDS STRUCTURE
-- ============================================================================
-- This script fixes old consultation and donation transactions that have
-- incorrect recipient_id values (pointing to donors instead of scholars)
-- ============================================================================

-- Step 1: Show OLD consultation transactions with wrong structure
-- These have user_id pointing to scholar but recipient_id pointing to member
SELECT 
    t.id,
    t.created_at,
    t.type,
    t.amount,
    t.user_id,
    t.recipient_id,
    t.description,
    scholar.full_name as scholar_name,
    scholar.role as user_role,
    recipient.full_name as recipient_name,
    recipient.role as recipient_role
FROM masjid_coin_transactions t
LEFT JOIN profiles scholar ON t.user_id = scholar.id
LEFT JOIN profiles recipient ON t.recipient_id = recipient.id
WHERE t.type = 'consultation'
  AND t.amount > 0
  AND scholar.role = 'scholar'
  AND recipient.role != 'scholar'
ORDER BY t.created_at DESC;

-- Step 2: Show OLD donation transactions with wrong structure
SELECT 
    t.id,
    t.created_at,
    t.type,
    t.amount,
    t.user_id,
    t.recipient_id,
    t.description,
    scholar.full_name as scholar_name,
    scholar.role as user_role,
    recipient.full_name as recipient_name,
    recipient.role as recipient_role
FROM masjid_coin_transactions t
LEFT JOIN profiles scholar ON t.user_id = scholar.id
LEFT JOIN profiles recipient ON t.recipient_id = recipient.id
WHERE t.type = 'donation'
  AND t.amount > 0
  AND scholar.role = 'scholar'
  AND recipient.role != 'scholar'
ORDER BY t.created_at DESC;

-- Step 3: Fix OLD consultation credit transactions
-- Change recipient_id from member to scholar for income records
UPDATE masjid_coin_transactions t
SET recipient_id = t.user_id
FROM profiles p
WHERE t.user_id = p.id
  AND p.role = 'scholar'
  AND t.type = 'consultation'
  AND t.amount > 0
  AND t.recipient_id != t.user_id;

-- Step 4: Fix OLD donation credit transactions
-- Change recipient_id from donor to scholar for income records
UPDATE masjid_coin_transactions t
SET recipient_id = t.user_id
FROM profiles p
WHERE t.user_id = p.id
  AND p.role = 'scholar'
  AND t.type = 'donation'
  AND t.amount > 0
  AND t.recipient_id != t.user_id;

-- Step 5: Verify the fixes
SELECT 
    t.id,
    t.created_at,
    t.type,
    t.amount,
    t.amount * 100 as naira,
    t.user_id,
    t.recipient_id,
    t.description,
    scholar.full_name as scholar_name
FROM masjid_coin_transactions t
LEFT JOIN profiles scholar ON t.recipient_id = scholar.id
WHERE t.type IN ('consultation', 'donation')
  AND t.amount > 0
  AND scholar.role = 'scholar'
ORDER BY t.created_at DESC;

-- ============================================================================
-- After running this script:
-- 1. Run FIX_SCHOLAR_BALANCES.sql to recalculate balances
-- 2. Refresh your Scholar Wallet page
-- 3. All past earnings should now appear correctly
-- ============================================================================
