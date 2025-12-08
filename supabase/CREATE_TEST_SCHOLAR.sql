-- =====================================================================
-- CREATE TEST SCHOLAR ACCOUNT
-- Run this to set up a test scholar with pricing for consultation booking tests
-- =====================================================================

-- Option 1: Make your current account (ssl4live@gmail.com) a scholar temporarily
UPDATE profiles 
SET role = 'scholar', 
    consultation_fee = 2500,
    livestream_fee = 5000,
    live_consultation_fee = 3000,
    is_online = true,
    specialization = 'Islamic Studies',
    available_slots = ARRAY['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00']
WHERE email = 'ssl4live@gmail.com';

-- Verify the scholar was created
SELECT id, email, role, 
       consultation_fee, 
       livestream_fee,
       live_consultation_fee,
       is_online, 
       specialization
FROM profiles 
WHERE email = 'ssl4live@gmail.com';

-- After testing as a scholar, run this to switch back to member:
-- UPDATE profiles SET role = 'member' WHERE email = 'ssl4live@gmail.com';
