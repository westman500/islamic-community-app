-- ============================================================================
-- CREATE CONSULTATION_BOOKINGS TABLE WITH PAYMENT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS consultation_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scholar_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending',
  payment_reference TEXT,
  amount_paid NUMERIC DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add pricing columns to profiles table for scholars/imams
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS livestream_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS live_consultation_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_slots TEXT[] DEFAULT '{}';

-- Indexes for consultation_bookings
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_user_id ON consultation_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_scholar_id ON consultation_bookings(scholar_id);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_payment_reference ON consultation_bookings(payment_reference);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_payment_status ON consultation_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_booking_date ON consultation_bookings(booking_date);

-- Add check constraint to ensure valid payment status
ALTER TABLE consultation_bookings
  DROP CONSTRAINT IF EXISTS check_payment_status;

ALTER TABLE consultation_bookings
  ADD CONSTRAINT check_payment_status 
  CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));

-- RLS Policies
ALTER TABLE consultation_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bookings" ON consultation_bookings;
CREATE POLICY "Users can view their own bookings"
  ON consultation_bookings
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = scholar_id
  );

DROP POLICY IF EXISTS "Users can create bookings" ON consultation_bookings;
CREATE POLICY "Users can create bookings"
  ON consultation_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON consultation_bookings;
CREATE POLICY "Users can update their own bookings"
  ON consultation_bookings
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = scholar_id);

DROP POLICY IF EXISTS "Service role can update payment status" ON consultation_bookings;
CREATE POLICY "Service role can update payment status"
  ON consultation_bookings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE consultation_bookings IS 'Tracks consultation bookings with payment information';
COMMENT ON COLUMN consultation_bookings.payment_status IS 'Status: pending, completed, failed, refunded';
COMMENT ON COLUMN consultation_bookings.payment_reference IS 'Paystack payment reference for verification';
COMMENT ON COLUMN consultation_bookings.amount_paid IS 'Actual amount paid in Naira';
COMMENT ON COLUMN profiles.consultation_fee IS 'Fee for private consultation sessions in Naira';
COMMENT ON COLUMN profiles.livestream_fee IS 'Fee for viewers to access paid livestreams in Naira';
COMMENT ON COLUMN profiles.live_consultation_fee IS 'Fee for live consultation during streams in Naira';
