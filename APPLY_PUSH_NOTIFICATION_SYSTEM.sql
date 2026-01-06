-- ============================================================================
-- COMPREHENSIVE PUSH NOTIFICATIONS SYSTEM
-- ============================================================================
-- This SQL file sets up triggers and functions to send push notifications
-- for all important events in the Islamic Community Platform
-- ============================================================================

-- Ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================================================
-- FUNCTION: Notify scholar when consultation is booked
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_scholar_consultation_booked()
RETURNS TRIGGER AS $$
DECLARE
  v_scholar_name TEXT;
  v_member_name TEXT;
  v_topic TEXT;
  v_amount NUMERIC;
BEGIN
  -- Get scholar and member names
  SELECT full_name INTO v_scholar_name FROM profiles WHERE id = NEW.scholar_id;
  SELECT full_name INTO v_member_name FROM profiles WHERE id = NEW.user_id;
  
  v_topic := COALESCE(NEW.topic, 'General consultation');
  v_amount := COALESCE(NEW.amount_paid, 0);
  
  -- Insert notification for scholar
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.scholar_id,
    'consultation_booked',
    '📅 New Consultation Booked!',
    v_member_name || ' booked a consultation: "' || v_topic || '" (₦' || (v_amount * 100)::TEXT || ')',
    json_build_object(
      'booking_id', NEW.id,
      'member_id', NEW.user_id,
      'member_name', v_member_name,
      'topic', v_topic,
      'amount', v_amount
    )::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for consultation booking
DROP TRIGGER IF EXISTS trigger_notify_scholar_consultation_booked ON consultation_bookings;
CREATE TRIGGER trigger_notify_scholar_consultation_booked
  AFTER INSERT ON consultation_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'pending' OR NEW.status = 'confirmed')
  EXECUTE FUNCTION notify_scholar_consultation_booked();

-- ============================================================================
-- FUNCTION: Notify both parties when consultation is completed
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_consultation_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_scholar_name TEXT;
  v_member_name TEXT;
BEGIN
  -- Only trigger when status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get names
    SELECT full_name INTO v_scholar_name FROM profiles WHERE id = NEW.scholar_id;
    SELECT full_name INTO v_member_name FROM profiles WHERE id = NEW.user_id;
    
    -- Notify member
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'consultation_completed',
      '✅ Consultation Completed',
      'Your consultation with ' || v_scholar_name || ' has ended. Please leave a review!',
      json_build_object(
        'booking_id', NEW.id,
        'scholar_id', NEW.scholar_id,
        'scholar_name', v_scholar_name
      )::jsonb
    );
    
    -- Notify scholar
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.scholar_id,
      'consultation_completed',
      '✅ Consultation Completed',
      'Consultation with ' || v_member_name || ' has ended successfully.',
      json_build_object(
        'booking_id', NEW.id,
        'member_id', NEW.user_id,
        'member_name', v_member_name
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for consultation completion
DROP TRIGGER IF EXISTS trigger_notify_consultation_completed ON consultation_bookings;
CREATE TRIGGER trigger_notify_consultation_completed
  AFTER UPDATE ON consultation_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_consultation_completed();

-- ============================================================================
-- FUNCTION: Notify users when transaction is completed
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_transaction_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_is_debit BOOLEAN;
  v_abs_amount NUMERIC;
  v_title TEXT;
  v_message TEXT;
BEGIN
  v_is_debit := NEW.amount < 0;
  v_abs_amount := ABS(NEW.amount);
  
  IF v_is_debit THEN
    v_title := '💸 Transaction Completed';
    v_message := NEW.description || ' - -' || v_abs_amount::TEXT || ' coins';
  ELSE
    v_title := '💰 Coins Received';
    v_message := NEW.description || ' - +' || v_abs_amount::TEXT || ' coins';
  END IF;
  
  -- Notify the user
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'transaction',
    v_title,
    v_message,
    json_build_object(
      'transaction_id', NEW.id,
      'amount', NEW.amount,
      'type', NEW.type,
      'description', NEW.description
    )::jsonb
  );
  
  -- If there's a recipient, notify them too
  IF NEW.recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.recipient_id,
      'transaction',
      '💰 Coins Received',
      NEW.description || ' - +' || v_abs_amount::TEXT || ' coins',
      json_build_object(
        'transaction_id', NEW.id,
        'amount', NEW.amount,
        'type', NEW.type,
        'description', NEW.description
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for transaction notifications
DROP TRIGGER IF EXISTS trigger_notify_transaction_completed ON masjid_coin_transactions;
CREATE TRIGGER trigger_notify_transaction_completed
  AFTER INSERT ON masjid_coin_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION notify_transaction_completed();

-- ============================================================================
-- FUNCTION: Notify scholar when zakat/donation is received
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_donation_received()
RETURNS TRIGGER AS $$
DECLARE
  v_donor_name TEXT;
  v_amount_naira NUMERIC;
BEGIN
  -- Only for donation type transactions
  IF NEW.type = 'donation' AND NEW.recipient_id IS NOT NULL THEN
    SELECT full_name INTO v_donor_name FROM profiles WHERE id = NEW.user_id;
    v_amount_naira := ABS(NEW.amount) * 100; -- Convert coins to Naira
    
    -- Notify the scholar/recipient
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.recipient_id,
      'donation_received',
      '💰 Zakat Received!',
      v_donor_name || ' sent you ₦' || v_amount_naira::TEXT || ' in zakat. Barakallahu feekum!',
      json_build_object(
        'donor_id', NEW.user_id,
        'donor_name', v_donor_name,
        'amount', v_amount_naira
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for donation notifications
DROP TRIGGER IF EXISTS trigger_notify_donation_received ON masjid_coin_transactions;
CREATE TRIGGER trigger_notify_donation_received
  AFTER INSERT ON masjid_coin_transactions
  FOR EACH ROW
  WHEN (NEW.type = 'donation' AND NEW.status = 'completed')
  EXECUTE FUNCTION notify_donation_received();

-- ============================================================================
-- COMPLETED!
-- ============================================================================
-- All notification triggers are now active
-- Apply this SQL in Supabase SQL Editor
-- ============================================================================
