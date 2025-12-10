-- =====================================================================
-- FIX PAYMENT STATUS CONSTRAINTS
-- Drop old constraints and create unified constraint with correct values
-- =====================================================================

-- Drop the old constraint that expects 'success'
ALTER TABLE consultation_bookings
  DROP CONSTRAINT IF EXISTS consultation_bookings_payment_status_chk;

-- Drop the other old constraint
ALTER TABLE consultation_bookings
  DROP CONSTRAINT IF EXISTS check_payment_status;

-- Create unified constraint with correct values
ALTER TABLE consultation_bookings
  ADD CONSTRAINT consultation_bookings_payment_status_chk
  CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded'));

-- Verify constraint
DO $$ 
BEGIN
  RAISE NOTICE '✅ Payment status constraint updated successfully!';
  RAISE NOTICE '📋 Allowed values: pending, completed, failed, refunded';
END $$;
