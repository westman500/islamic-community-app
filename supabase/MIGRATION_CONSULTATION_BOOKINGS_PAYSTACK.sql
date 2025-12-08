-- =========================================================================
-- MIGRATION: Ensure consultation_bookings has Paystack fields
-- =========================================================================
-- Adds/aligns columns for Paystack integration:
-- - paystack_reference TEXT (unique per booking)
-- - payment_status TEXT CHECK (pending|success|failed) DEFAULT 'pending'
-- - status TEXT CHECK (pending|confirmed|cancelled) DEFAULT 'pending'
-- Also creates helpful indexes.

DO $$
BEGIN
  -- Add paystack_reference if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultation_bookings' AND column_name = 'paystack_reference'
  ) THEN
    ALTER TABLE consultation_bookings ADD COLUMN paystack_reference text;
  END IF;

  -- Add payment_status with constraint if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultation_bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE consultation_bookings ADD COLUMN payment_status text;
  END IF;

  -- Add status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultation_bookings' AND column_name = 'status'
  ) THEN
    ALTER TABLE consultation_bookings ADD COLUMN status text;
  END IF;
END $$;

-- Constraints: payment_status and status allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultation_bookings_payment_status_chk'
  ) THEN
    ALTER TABLE consultation_bookings
    ADD CONSTRAINT consultation_bookings_payment_status_chk
    CHECK (payment_status IN ('pending','success','failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultation_bookings_status_chk'
  ) THEN
    ALTER TABLE consultation_bookings
    ADD CONSTRAINT consultation_bookings_status_chk
    CHECK (status IN ('pending','confirmed','cancelled'));
  END IF;
END $$;

-- Defaults for new rows
ALTER TABLE consultation_bookings ALTER COLUMN payment_status SET DEFAULT 'pending';
ALTER TABLE consultation_bookings ALTER COLUMN status SET DEFAULT 'pending';

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_consultation_bookings_paystack_reference'
  ) THEN
    CREATE INDEX idx_consultation_bookings_paystack_reference ON consultation_bookings (paystack_reference);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_consultation_bookings_status'
  ) THEN
    CREATE INDEX idx_consultation_bookings_status ON consultation_bookings (status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_consultation_bookings_payment_status'
  ) THEN
    CREATE INDEX idx_consultation_bookings_payment_status ON consultation_bookings (payment_status);
  END IF;
END $$;

-- Optional: backfill status/payment_status for existing rows where null
UPDATE consultation_bookings
SET payment_status = COALESCE(payment_status, 'pending'),
    status = COALESCE(status, 'pending')
WHERE payment_status IS NULL OR status IS NULL;

-- Optional: backfill paystack_reference from existing `reference` column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consultation_bookings' AND column_name = 'reference'
  ) THEN
    UPDATE consultation_bookings
    SET paystack_reference = COALESCE(paystack_reference, reference)
    WHERE paystack_reference IS NULL AND reference IS NOT NULL;
  END IF;
END $$;
