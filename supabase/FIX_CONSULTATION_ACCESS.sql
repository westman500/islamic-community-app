-- Fix RLS policies for consultation bookings so scholars can access confirmed consultations

-- Drop existing policies
DROP POLICY IF EXISTS "view_consultation_bookings" ON consultation_bookings;
DROP POLICY IF EXISTS "create_consultation_bookings" ON consultation_bookings;
DROP POLICY IF EXISTS "update_own_bookings" ON consultation_bookings;

-- Recreate with proper access for scholars
-- Users can view their own bookings (as user)
-- Scholars can view bookings where they are the scholar
CREATE POLICY "view_consultation_bookings" ON consultation_bookings
  FOR SELECT USING (
    user_id = auth.uid() OR scholar_id = auth.uid()
  );

-- Users can create bookings
CREATE POLICY "create_consultation_bookings" ON consultation_bookings
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Users and scholars can update bookings they're part of
CREATE POLICY "update_consultation_bookings" ON consultation_bookings
  FOR UPDATE USING (
    user_id = auth.uid() OR scholar_id = auth.uid()
  );

-- Ensure consultation_messages policies allow scholars to access
DROP POLICY IF EXISTS "view_consultation_messages" ON consultation_messages;
DROP POLICY IF EXISTS "send_consultation_messages" ON consultation_messages;

-- Both user and scholar can view messages from their consultations
CREATE POLICY "view_consultation_messages" ON consultation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM consultation_bookings
      WHERE consultation_bookings.id = consultation_messages.booking_id
      AND (consultation_bookings.user_id = auth.uid() 
           OR consultation_bookings.scholar_id = auth.uid())
    )
  );

-- Both user and scholar can send messages in confirmed consultations
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
