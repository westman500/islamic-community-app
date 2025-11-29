-- Check user role for welshman221@gmail.com
SELECT 
  id,
  email,
  full_name,
  role,
  certificate_verified
FROM profiles
WHERE email = 'welshman221@gmail.com';

-- If role is NULL or 'user', update it to 'imam'
-- Uncomment and run this if needed:
-- UPDATE profiles 
-- SET role = 'imam'
-- WHERE email = 'welshman221@gmail.com';
