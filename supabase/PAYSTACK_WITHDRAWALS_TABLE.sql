-- Create withdrawal_requests table for tracking scholar withdrawals
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_reference TEXT UNIQUE,
  transfer_code TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_code TEXT,
  bank_name TEXT,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_reference ON withdrawal_requests(payment_reference);
CREATE INDEX idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own withdrawal requests
CREATE POLICY "Users can view own withdrawals"
  ON withdrawal_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Scholars can create withdrawal requests
CREATE POLICY "Scholars can create withdrawals"
  ON withdrawal_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('scholar', 'imam')
    )
  );

-- Policy: Users can cancel their pending withdrawals
CREATE POLICY "Users can cancel pending withdrawals"
  ON withdrawal_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

-- Add comment
COMMENT ON TABLE withdrawal_requests IS 'Tracks withdrawal requests from scholars to their bank accounts via Paystack';
