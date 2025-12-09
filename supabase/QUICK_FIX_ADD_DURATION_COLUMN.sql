-- Quick fix: Add consultation_duration column to profiles
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS consultation_duration INTEGER DEFAULT 30;

COMMENT ON COLUMN profiles.consultation_duration IS 'Default consultation duration in minutes for scholars';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'consultation_duration';
