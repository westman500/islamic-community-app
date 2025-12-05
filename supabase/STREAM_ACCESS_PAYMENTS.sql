-- ============================================================================
-- STREAM ACCESS PAYMENTS TABLE FOR PAID LIVESTREAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_access_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scholar_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  payment_reference TEXT NOT NULL UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stream_access_stream_id ON stream_access_payments(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_access_user_id ON stream_access_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_access_payment_reference ON stream_access_payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_stream_access_payment_status ON stream_access_payments(payment_status);

-- RLS Policies
ALTER TABLE stream_access_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own stream access payments" ON stream_access_payments;
CREATE POLICY "Users can view their own stream access payments"
  ON stream_access_payments
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = scholar_id);

DROP POLICY IF EXISTS "Users can create stream access payments" ON stream_access_payments;
CREATE POLICY "Users can create stream access payments"
  ON stream_access_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can update stream access payments" ON stream_access_payments;
CREATE POLICY "Service role can update stream access payments"
  ON stream_access_payments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE stream_access_payments IS 'Tracks payments for accessing paid livestreams';
COMMENT ON COLUMN stream_access_payments.amount_paid IS 'Amount paid in Naira for stream access';
COMMENT ON COLUMN stream_access_payments.payment_reference IS 'Paystack payment reference for verification';
COMMENT ON COLUMN stream_access_payments.payment_status IS 'Status: pending, completed, failed, refunded';
