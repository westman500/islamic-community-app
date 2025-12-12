-- Debug script to check scholar balance issue for ssl4live@gmail.com

-- 1. Find the scholar's profile
SELECT 
    id,
    email,
    full_name,
    role,
    masjid_coin_balance as current_balance_in_coins,
    (masjid_coin_balance * 100) as current_balance_in_naira
FROM profiles
WHERE email = 'ssl4live@gmail.com';

-- 2. Check all transactions for this scholar
SELECT 
    t.id,
    t.created_at,
    t.type,
    t.amount as amount_in_coins,
    (t.amount * 100) as amount_in_naira,
    t.payment_status,
    t.status,
    t.user_id,
    t.recipient_id,
    sender.full_name as sender_name,
    recipient.full_name as recipient_name
FROM masjid_coin_transactions t
LEFT JOIN profiles sender ON t.user_id = sender.id
LEFT JOIN profiles recipient ON t.recipient_id = recipient.id
WHERE t.recipient_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com')
   OR t.user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com')
ORDER BY t.created_at DESC
LIMIT 50;

-- 3. Calculate what the balance SHOULD be
SELECT 
    'Expected Balance' as calculation,
    SUM(CASE 
        WHEN recipient_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') 
             AND payment_status = 'completed' 
        THEN amount 
        ELSE 0 
    END) as total_credits_coins,
    SUM(CASE 
        WHEN user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') 
             AND payment_status = 'completed'
             AND amount < 0
        THEN amount 
        ELSE 0 
    END) as total_debits_coins,
    SUM(CASE 
        WHEN recipient_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') 
             AND payment_status = 'completed' 
        THEN amount 
        ELSE 0 
    END) + SUM(CASE 
        WHEN user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') 
             AND payment_status = 'completed'
             AND amount < 0
        THEN amount 
        ELSE 0 
    END) as expected_balance_coins,
    (SUM(CASE 
        WHEN recipient_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') 
             AND payment_status = 'completed' 
        THEN amount 
        ELSE 0 
    END) + SUM(CASE 
        WHEN user_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com') 
             AND payment_status = 'completed'
             AND amount < 0
        THEN amount 
        ELSE 0 
    END)) * 100 as expected_balance_naira
FROM masjid_coin_transactions;

-- 4. Check recent consultation bookings
SELECT 
    b.id,
    b.created_at,
    b.status,
    b.amount,
    b.scholar_id,
    scholar.full_name as scholar_name,
    scholar.email as scholar_email,
    member.full_name as member_name
FROM consultation_bookings b
LEFT JOIN profiles scholar ON b.scholar_id = scholar.id
LEFT JOIN profiles member ON b.user_id = member.id
WHERE b.scholar_id = (SELECT id FROM profiles WHERE email = 'ssl4live@gmail.com')
ORDER BY b.created_at DESC
LIMIT 10;
