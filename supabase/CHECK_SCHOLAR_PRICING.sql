-- Check scholar pricing settings
SELECT 
  id,
  full_name,
  role,
  consultation_fee,
  consultation_duration,
  live_consultation_fee,
  is_online
FROM profiles
WHERE role IN ('scholar', 'imam');

-- If consultation_duration is NULL or 0, update it to default 30 minutes
UPDATE profiles
SET consultation_duration = 30
WHERE role IN ('scholar', 'imam') 
  AND (consultation_duration IS NULL OR consultation_duration = 0);

-- Verify the update
SELECT 
  id,
  full_name,
  consultation_fee,
  consultation_duration
FROM profiles
WHERE role IN ('scholar', 'imam');
