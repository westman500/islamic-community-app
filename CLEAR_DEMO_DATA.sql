-- Clear all demo data from the database
-- Run this script in Supabase SQL Editor before production deployment

-- WARNING: This will delete all test data, activities, livestreams, and demo users
-- Make sure to backup your database before running this script

BEGIN;

-- 1. Clear all activities (demo data)
DELETE FROM activities;

-- 2. Clear all livestreams and related data
DELETE FROM stream_reactions;
DELETE FROM stream_access;
DELETE FROM streams;

-- 3. Clear consultation bookings and messages
DELETE FROM consultation_messages;
DELETE FROM consultation_bookings;

-- 4. Clear reviews
DELETE FROM reviews;

-- 5. Clear Zakat donations
DELETE FROM zakat_donations;

-- 6. Clear prayer services
DELETE FROM prayer_services;

-- 7. Clear demo scholar/imam profiles
-- Remove demo and test user accounts
DELETE FROM profiles 
WHERE role IN ('scholar', 'imam') 
AND (email LIKE '%demo%' OR email LIKE '%test%');

DELETE FROM auth.users 
WHERE email LIKE '%demo%' OR email LIKE '%test%';

-- 8. Reset auto-increment sequences (if needed)
-- This ensures new records start from 1
SELECT setval(pg_get_serial_sequence('activities', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('streams', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('consultation_bookings', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('reviews', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('zakat_donations', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('prayer_services', 'id'), 1, false);

COMMIT;

-- Verify data has been cleared
SELECT 'activities' as table_name, COUNT(*) as remaining_rows FROM activities
UNION ALL
SELECT 'streams', COUNT(*) FROM streams
UNION ALL
SELECT 'stream_reactions', COUNT(*) FROM stream_reactions
UNION ALL
SELECT 'stream_access', COUNT(*) FROM stream_access
UNION ALL
SELECT 'consultation_bookings', COUNT(*) FROM consultation_bookings
UNION ALL
SELECT 'consultation_messages', COUNT(*) FROM consultation_messages
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'zakat_donations', COUNT(*) FROM zakat_donations
UNION ALL
SELECT 'prayer_services', COUNT(*) FROM prayer_services;

-- Production Checklist:
-- ✅ Demo data cleared
-- ⏸️  Consider removing demo user accounts (commented out above)
-- ⏸️  Update RLS policies if needed
-- ⏸️  Verify app functions correctly with empty database
-- ⏸️  Create initial admin/imam accounts for production
