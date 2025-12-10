-- Add bank account fields to profiles table for withdrawal processing

-- Add bank account columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS paystack_recipient_code VARCHAR(50);

-- Add comment
COMMENT ON COLUMN profiles.bank_account_number IS 'Bank account number for withdrawals';
COMMENT ON COLUMN profiles.bank_code IS 'Bank code for Paystack transfers';
COMMENT ON COLUMN profiles.bank_name IS 'Bank name for display';
COMMENT ON COLUMN profiles.bank_account_name IS 'Account name (must match bank records)';
COMMENT ON COLUMN profiles.paystack_recipient_code IS 'Paystack recipient code for faster transfers';

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_paystack_recipient ON profiles(paystack_recipient_code) WHERE paystack_recipient_code IS NOT NULL;
