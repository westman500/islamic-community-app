-- Create consultation_messages table for real-time chat
CREATE TABLE IF NOT EXISTS consultation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES consultation_bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_consultation_messages_booking 
  ON consultation_messages(booking_id, created_at);

-- Enable RLS
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages from their consultations
CREATE POLICY "view_consultation_messages" ON consultation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM consultation_bookings
      WHERE consultation_bookings.id = consultation_messages.booking_id
      AND (consultation_bookings.user_id = auth.uid() 
           OR consultation_bookings.scholar_id = auth.uid())
    )
  );

-- Policy: Users can send messages in their consultations
CREATE POLICY "send_consultation_messages" ON consultation_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM consultation_bookings
      WHERE consultation_bookings.id = booking_id
      AND consultation_bookings.status = 'confirmed'
      AND (consultation_bookings.user_id = auth.uid() 
           OR consultation_bookings.scholar_id = auth.uid())
    )
  );

-- Add consultation_duration column to consultation_bookings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consultation_bookings' 
    AND column_name = 'consultation_duration'
  ) THEN
    ALTER TABLE consultation_bookings 
    ADD COLUMN consultation_duration INTEGER DEFAULT 30;
  END IF;
END $$;

COMMENT ON COLUMN consultation_bookings.consultation_duration IS 'Duration in minutes';

-- Add consultation_duration column to profiles for scholar settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'consultation_duration'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN consultation_duration INTEGER DEFAULT 30;
  END IF;
END $$;

COMMENT ON COLUMN profiles.consultation_duration IS 'Default consultation duration in minutes for scholars';

-- Add consultation_extension transaction type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'masjid_coin_transactions_type_check'
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%consultation_extension%'
  ) THEN
    -- Drop old constraint
    ALTER TABLE masjid_coin_transactions 
    DROP CONSTRAINT IF EXISTS masjid_coin_transactions_type_check;
    
    -- Add new constraint with consultation_extension
    ALTER TABLE masjid_coin_transactions
    ADD CONSTRAINT masjid_coin_transactions_type_check
    CHECK (type IN ('deposit', 'consultation', 'consultation_extension', 'donation', 'transfer', 'refund'));
  END IF;
END $$;
