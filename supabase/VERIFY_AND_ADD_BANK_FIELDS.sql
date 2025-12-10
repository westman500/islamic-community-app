-- Step 1: Check if columns exist
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('bank_account_number', 'bank_code', 'bank_name', 'bank_account_name', 'paystack_recipient_code')
ORDER BY column_name;

-- Step 2: Add columns if they don't exist (run this if Step 1 shows missing columns)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS paystack_recipient_code VARCHAR(50);

-- Step 3: Verify columns were added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('bank_account_number', 'bank_code', 'bank_name', 'bank_account_name', 'paystack_recipient_code')
ORDER BY column_name;

-- Step 4: Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_paystack_recipient 
ON profiles(paystack_recipient_code) 
WHERE paystack_recipient_code IS NOT NULL;

-- SUCCESS MESSAGE
SELECT 'Bank account fields added successfully!' as status;
