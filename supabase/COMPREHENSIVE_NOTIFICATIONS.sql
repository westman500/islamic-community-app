-- Comprehensive Push Notification System
-- Run this in Supabase SQL Editor

-- 1. Create notifications table to track all notification events
CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON push_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON push_notifications(read);

-- Enable RLS
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON push_notifications;
CREATE POLICY "Users can view their own notifications"
ON push_notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON push_notifications;
CREATE POLICY "Users can update their own notifications"
ON push_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 2. Function to send notification
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO push_notifications (user_id, title, body, type, data)
  VALUES (p_user_id, p_title, p_body, p_type, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for new consultation bookings (notify scholar)
CREATE OR REPLACE FUNCTION notify_scholar_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  scholar_name TEXT;
  member_name TEXT;
BEGIN
  -- Get names
  SELECT full_name INTO scholar_name FROM profiles WHERE id = NEW.scholar_id;
  SELECT full_name INTO member_name FROM profiles WHERE id = NEW.user_id;
  
  -- Notify scholar
  PERFORM send_push_notification(
    NEW.scholar_id,
    '📅 New Consultation Request',
    member_name || ' has booked a consultation about: ' || NEW.topic,
    'consultation_booking',
    jsonb_build_object('booking_id', NEW.id, 'user_name', member_name)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_scholar_new_booking ON consultation_bookings;
CREATE TRIGGER trigger_notify_scholar_new_booking
AFTER INSERT ON consultation_bookings
FOR EACH ROW
EXECUTE FUNCTION notify_scholar_new_booking();

-- 4. Trigger for consultation messages (notify both parties)
CREATE OR REPLACE FUNCTION notify_consultation_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  booking_data RECORD;
  recipient_id UUID;
BEGIN
  -- Get sender name and booking details
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  SELECT user_id, scholar_id INTO booking_data FROM consultation_bookings WHERE id = NEW.booking_id;
  
  -- Determine recipient (opposite of sender)
  IF NEW.sender_id = booking_data.user_id THEN
    recipient_id := booking_data.scholar_id;
  ELSE
    recipient_id := booking_data.user_id;
  END IF;
  
  -- Notify recipient
  PERFORM send_push_notification(
    recipient_id,
    '💬 New Message from ' || sender_name,
    NEW.message,
    'consultation_message',
    jsonb_build_object('booking_id', NEW.booking_id, 'sender_name', sender_name)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_consultation_message ON consultation_messages;
CREATE TRIGGER trigger_notify_consultation_message
AFTER INSERT ON consultation_messages
FOR EACH ROW
EXECUTE FUNCTION notify_consultation_message();

-- 5. Trigger for scholar joining chat (notify member)
CREATE OR REPLACE FUNCTION notify_member_scholar_joined()
RETURNS TRIGGER AS $$
DECLARE
  scholar_name TEXT;
BEGIN
  IF NEW.scholar_accepted = TRUE AND OLD.scholar_accepted = FALSE THEN
    SELECT full_name INTO scholar_name FROM profiles WHERE id = NEW.scholar_id;
    
    PERFORM send_push_notification(
      NEW.user_id,
      '✅ Scholar Joined!',
      scholar_name || ' has accepted your consultation request',
      'scholar_joined',
      jsonb_build_object('booking_id', NEW.id, 'scholar_name', scholar_name)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_member_scholar_joined ON consultation_bookings;
CREATE TRIGGER trigger_notify_member_scholar_joined
AFTER UPDATE ON consultation_bookings
FOR EACH ROW
EXECUTE FUNCTION notify_member_scholar_joined();

-- 6. Trigger for zakat donations (notify scholar)
CREATE OR REPLACE FUNCTION notify_zakat_donation()
RETURNS TRIGGER AS $$
DECLARE
  donor_name TEXT;
  amount_value INTEGER;
BEGIN
  IF NEW.type = 'donation' AND NEW.recipient_id IS NOT NULL THEN
    SELECT full_name INTO donor_name FROM profiles WHERE id = NEW.user_id;
    amount_value := ABS(NEW.amount);
    
    PERFORM send_push_notification(
      NEW.recipient_id,
      '🤲 Zakat Donation Received',
      donor_name || ' donated ' || amount_value || ' coins',
      'zakat_donation',
      jsonb_build_object('transaction_id', NEW.id, 'amount', amount_value, 'donor_name', donor_name)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_zakat_donation ON masjid_coin_transactions;
CREATE TRIGGER trigger_notify_zakat_donation
AFTER INSERT ON masjid_coin_transactions
FOR EACH ROW
EXECUTE FUNCTION notify_zakat_donation();

-- 7. Trigger for coin deposits (notify member)
CREATE OR REPLACE FUNCTION notify_coin_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.amount > 0 THEN
    PERFORM send_push_notification(
      NEW.user_id,
      '💰 Coins Deposited',
      'Your wallet has been credited with ' || NEW.amount || ' coins',
      'coin_deposit',
      jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_coin_deposit ON masjid_coin_transactions;
CREATE TRIGGER trigger_notify_coin_deposit
AFTER INSERT ON masjid_coin_transactions
FOR EACH ROW
EXECUTE FUNCTION notify_coin_deposit();

-- 8. Trigger for new reels (notify followers/members)
CREATE OR REPLACE FUNCTION notify_new_reel()
RETURNS TRIGGER AS $$
DECLARE
  creator_name TEXT;
BEGIN
  IF NEW.is_approved = TRUE THEN
    SELECT full_name INTO creator_name FROM profiles WHERE id = NEW.uploaded_by;
    
    -- In a real implementation, you'd notify followers
    -- For now, we'll create a notification record that can be queried
    INSERT INTO push_notifications (user_id, title, body, type, data)
    SELECT 
      id,
      '🎬 New Reel Posted',
      creator_name || ' posted a new reel',
      'new_reel',
      jsonb_build_object('reel_id', NEW.id, 'creator_name', creator_name)
    FROM profiles
    WHERE role = 'member' AND id != NEW.uploaded_by
    LIMIT 10; -- Notify first 10 members, adjust as needed
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_reel ON islamic_reels;
CREATE TRIGGER trigger_notify_new_reel
AFTER INSERT ON islamic_reels
FOR EACH ROW
EXECUTE FUNCTION notify_new_reel();

-- 9. Trigger for reel likes (notify creator)
CREATE OR REPLACE FUNCTION notify_reel_like()
RETURNS TRIGGER AS $$
DECLARE
  liker_name TEXT;
  reel_creator UUID;
BEGIN
  SELECT full_name INTO liker_name FROM profiles WHERE id = NEW.user_id;
  SELECT uploaded_by INTO reel_creator FROM islamic_reels WHERE id = NEW.reel_id;
  
  -- Don't notify if user likes their own reel
  IF reel_creator != NEW.user_id THEN
    PERFORM send_push_notification(
      reel_creator,
      '❤️ New Like on Your Reel',
      liker_name || ' liked your reel',
      'reel_like',
      jsonb_build_object('reel_id', NEW.reel_id, 'liker_name', liker_name)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_reel_like ON reel_likes;
CREATE TRIGGER trigger_notify_reel_like
AFTER INSERT ON reel_likes
FOR EACH ROW
EXECUTE FUNCTION notify_reel_like();

-- 10. Trigger for scholar going online (notify members)
CREATE OR REPLACE FUNCTION notify_scholar_online()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_online = TRUE AND OLD.is_online = FALSE AND NEW.role IN ('scholar', 'imam') THEN
    INSERT INTO push_notifications (user_id, title, body, type, data)
    SELECT 
      id,
      '✨ Scholar Online',
      NEW.full_name || ' is now available for consultations',
      'scholar_online',
      jsonb_build_object('scholar_id', NEW.id, 'scholar_name', NEW.full_name)
    FROM profiles
    WHERE role = 'member'
    LIMIT 20; -- Notify first 20 members
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_scholar_online ON profiles;
CREATE TRIGGER trigger_notify_scholar_online
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION notify_scholar_online();

-- Success message
SELECT 'Comprehensive push notification system configured!' as status;
SELECT COUNT(*) as total_notification_triggers FROM pg_trigger WHERE tgname LIKE 'trigger_notify%';
