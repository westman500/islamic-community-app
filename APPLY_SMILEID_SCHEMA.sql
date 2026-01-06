-- ============================================================================
-- SMILE ID VERIFICATION SCHEMA
-- ============================================================================
-- Apply this to add verification_data table and related schema for Smile ID
-- ============================================================================

-- Add smileid_verified column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smileid_verified BOOLEAN DEFAULT false;

-- Create verification_data table
CREATE TABLE IF NOT EXISTS verification_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN ('phone', 'email', 'face', 'certificate', 'smileid')),
    verification_provider TEXT, -- 'smileid', 'twilio', etc.
    verification_id TEXT, -- External verification ID
    data JSONB, -- Store verification metadata
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired', 'completed', 'approved', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_data_user ON verification_data(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_data_type ON verification_data(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_data_status ON verification_data(status);

-- Enable RLS
ALTER TABLE verification_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (silently fail if they don't)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own verification data" ON verification_data;
    DROP POLICY IF EXISTS "Users can insert own verification data" ON verification_data;
    DROP POLICY IF EXISTS "Service role can manage all verification data" ON verification_data;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- RLS Policy: Users can view their own verification data
CREATE POLICY "Users can view own verification data"
    ON verification_data FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own verification data
CREATE POLICY "Users can insert own verification data"
    ON verification_data FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Service role can do everything (for callbacks)
CREATE POLICY "Service role can manage all verification data"
    ON verification_data FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON verification_data TO authenticated;
GRANT ALL ON verification_data TO service_role;
