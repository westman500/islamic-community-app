-- =========================================================================
-- VERIFY: Realtime publication and RLS for consultation_bookings
-- =========================================================================
-- Check publication membership
SELECT
  p.pubname AS publication,
  t.schemaname || '.' || t.tablename AS table
FROM pg_publication p
JOIN pg_publication_tables t ON t.pubname = p.pubname
WHERE t.tablename = 'consultation_bookings';

-- Inspect RLS policies
SELECT
  polname,
  schemaname,
  tablename,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'consultation_bookings';

-- If consultation_bookings is not in publication, add it:
-- ALTER PUBLICATION supabase_realtime ADD TABLE consultation_bookings;

-- Typical RLS read policy (example):
-- CREATE POLICY "read own bookings" ON consultation_bookings
--   FOR SELECT USING (
--     auth.uid() = user_id OR auth.uid() = scholar_id
--   );

-- Ensure RLS is enabled (should be true)
SELECT relname AS table, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'consultation_bookings';
