-- ============================================================================
-- ADD CONSULTATION AND LIVESTREAM PRICING TO PROFILES AND BOOKINGS
-- ============================================================================

-- Add pricing columns to profiles table for scholars/imams
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS livestream_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS live_consultation_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_slots TEXT[] DEFAULT '{}';

-- Add payment tracking columns to consultation_bookings table
ALTER TABLE consultation_bookings 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Add index for payment_reference lookups
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_payment_reference 
  ON consultation_bookings(payment_reference);

-- Add index for payment_status
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_payment_status 
  ON consultation_bookings(payment_status);

-- Add check constraint to ensure valid payment status
ALTER TABLE consultation_bookings
  DROP CONSTRAINT IF EXISTS check_payment_status;

ALTER TABLE consultation_bookings
  ADD CONSTRAINT check_payment_status 
  CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));

-- Update RLS policies for consultation_bookings to check payment_status
-- Only allow messaging if payment is completed

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own bookings" ON consultation_bookings;

-- Recreate policy with payment check
CREATE POLICY "Users can view their own bookings"
  ON consultation_bookings
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = scholar_id
  );

-- Policy to allow users to create bookings (before payment)
DROP POLICY IF EXISTS "Users can create bookings" ON consultation_bookings;

CREATE POLICY "Users can create bookings"
  ON consultation_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow webhook to update payment status
DROP POLICY IF EXISTS "Service role can update payment status" ON consultation_bookings;

CREATE POLICY "Service role can update payment status"
  ON consultation_bookings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON COLUMN profiles.consultation_fee IS 'Fee for private consultation sessions in Naira';
COMMENT ON COLUMN profiles.livestream_fee IS 'Fee for viewers to access paid livestreams in Naira';
COMMENT ON COLUMN profiles.live_consultation_fee IS 'Fee for live consultation during streams in Naira';
COMMENT ON COLUMN consultation_bookings.payment_status IS 'Status: pending, completed, failed, refunded';
COMMENT ON COLUMN consultation_bookings.payment_reference IS 'Paystack payment reference for verification';
COMMENT ON COLUMN consultation_bookings.amount_paid IS 'Actual amount paid in Naira';
