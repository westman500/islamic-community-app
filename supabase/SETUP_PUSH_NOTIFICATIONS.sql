-- =====================================================
-- PUSH NOTIFICATIONS SETUP
-- Complete notification system for all app events
-- =====================================================

-- Function to send push notification via edge function
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_push_token TEXT;
BEGIN
  -- Get user's push token
  SELECT push_token INTO v_push_token
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_push_token IS NOT NULL THEN
    -- Call edge function to send notification
    -- (This will be handled by the edge function send-push-notification)
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'token', v_push_token,
        'title', p_title,
        'body', p_body,
        'data', p_data
      )
    );
  END IF;
END;
$$;

-- =====================================================
-- LIVESTREAM NOTIFICATIONS
-- =====================================================

-- Notify followers when scholar starts livestream
CREATE OR REPLACE FUNCTION notify_stream_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scholar_name TEXT;
  v_follower_id UUID;
BEGIN
  -- Only notify when stream becomes active
  IF NEW.is_active = TRUE AND (OLD.is_active IS NULL OR OLD.is_active = FALSE) THEN
    -- Get scholar name
    SELECT full_name INTO v_scholar_name
    FROM profiles
    WHERE id = NEW.scholar_id;
    
    -- Notify all users (followers system can be added later)
    FOR v_follower_id IN 
      SELECT id FROM profiles WHERE role = 'member'
    LOOP
      PERFORM send_push_notification(
        v_follower_id,
        '🔴 Live Stream Started',
        v_scholar_name || ' is now live: ' || NEW.title,
        jsonb_build_object(
          'type', 'livestream',
          'stream_id', NEW.id,
          'scholar_id', NEW.scholar_id
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_stream_start ON streams;
CREATE TRIGGER trigger_notify_stream_start
AFTER INSERT OR UPDATE ON streams
FOR EACH ROW
EXECUTE FUNCTION notify_stream_start();

-- =====================================================
-- LIVESTREAM COMMENT NOTIFICATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION notify_stream_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scholar_id UUID;
  v_commenter_name TEXT;
BEGIN
  -- Get stream owner (scholar)
  SELECT scholar_id INTO v_scholar_id
  FROM streams
  WHERE id = NEW.stream_id;
  
  -- Get commenter name
  SELECT full_name INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Notify scholar
  IF v_scholar_id != NEW.user_id THEN
    PERFORM send_push_notification(
      v_scholar_id,
      '💬 New Comment',
      v_commenter_name || ': ' || LEFT(NEW.message, 50),
      jsonb_build_object(
        'type', 'comment',
        'stream_id', NEW.stream_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_stream_comment ON stream_comments;
CREATE TRIGGER trigger_notify_stream_comment
AFTER INSERT ON stream_comments
FOR EACH ROW
EXECUTE FUNCTION notify_stream_comment();

-- =====================================================
-- LIVESTREAM REACTIONS NOTIFICATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION notify_stream_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scholar_id UUID;
  v_likes_count INTEGER;
BEGIN
  -- Only notify on INSERT (not UPDATE)
  IF TG_OP = 'INSERT' THEN
    -- Get stream owner
    SELECT scholar_id INTO v_scholar_id
    FROM streams
    WHERE id = NEW.stream_id;
    
    -- Get total likes
    SELECT likes_count INTO v_likes_count
    FROM streams
    WHERE id = NEW.stream_id;
    
    -- Notify scholar (only every 10 likes to avoid spam)
    IF v_likes_count % 10 = 0 THEN
      PERFORM send_push_notification(
        v_scholar_id,
        '❤️ Stream Milestone!',
        'Your stream reached ' || v_likes_count || ' likes!',
        jsonb_build_object(
          'type', 'likes',
          'stream_id', NEW.stream_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_stream_reaction ON stream_reactions;
CREATE TRIGGER trigger_notify_stream_reaction
AFTER INSERT ON stream_reactions
FOR EACH ROW
EXECUTE FUNCTION notify_stream_reaction();

-- =====================================================
-- CONSULTATION NOTIFICATIONS
-- =====================================================

-- Notify scholar when consultation is booked
CREATE OR REPLACE FUNCTION notify_consultation_booked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get user name
    SELECT full_name INTO v_user_name
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Notify scholar
    PERFORM send_push_notification(
      NEW.scholar_id,
      '📅 New Consultation Booked',
      v_user_name || ' booked a consultation on ' || NEW.booking_date || ' at ' || NEW.booking_time,
      jsonb_build_object(
        'type', 'consultation',
        'booking_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_consultation_booked ON consultation_bookings;
CREATE TRIGGER trigger_notify_consultation_booked
AFTER INSERT ON consultation_bookings
FOR EACH ROW
EXECUTE FUNCTION notify_consultation_booked();

-- Notify member when scholar accepts consultation
CREATE OR REPLACE FUNCTION notify_consultation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scholar_name TEXT;
BEGIN
  IF NEW.scholar_accepted = TRUE AND (OLD.scholar_accepted IS NULL OR OLD.scholar_accepted = FALSE) THEN
    -- Get scholar name
    SELECT full_name INTO v_scholar_name
    FROM profiles
    WHERE id = NEW.scholar_id;
    
    -- Notify user
    PERFORM send_push_notification(
      NEW.user_id,
      '✅ Consultation Confirmed',
      v_scholar_name || ' has accepted your consultation request!',
      jsonb_build_object(
        'type', 'consultation_accepted',
        'booking_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_consultation_accepted ON consultation_bookings;
CREATE TRIGGER trigger_notify_consultation_accepted
AFTER UPDATE ON consultation_bookings
FOR EACH ROW
EXECUTE FUNCTION notify_consultation_accepted();

-- =====================================================
-- CONSULTATION MESSAGE NOTIFICATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION notify_consultation_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_sender_name TEXT;
  v_recipient_id UUID;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM consultation_bookings
  WHERE id = NEW.booking_id;
  
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine recipient (the other party in the consultation)
  IF NEW.sender_id = v_booking.scholar_id THEN
    v_recipient_id := v_booking.user_id;
  ELSE
    v_recipient_id := v_booking.scholar_id;
  END IF;
  
  -- Notify recipient
  PERFORM send_push_notification(
    v_recipient_id,
    '💬 New Message from ' || v_sender_name,
    LEFT(NEW.message, 50),
    jsonb_build_object(
      'type', 'consultation_message',
      'booking_id', NEW.booking_id
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_consultation_message ON consultation_messages;
CREATE TRIGGER trigger_notify_consultation_message
AFTER INSERT ON consultation_messages
FOR EACH ROW
EXECUTE FUNCTION notify_consultation_message();

-- =====================================================
-- MASJID COIN NOTIFICATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION notify_coin_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify recipient (scholar) when they receive coins
  IF NEW.recipient_id IS NOT NULL AND NEW.amount > 0 AND NEW.payment_status = 'completed' THEN
    PERFORM send_push_notification(
      NEW.recipient_id,
      '💰 Payment Received',
      'You received ₦' || (NEW.amount * 100)::TEXT || ' from ' || NEW.type,
      jsonb_build_object(
        'type', 'payment_received',
        'amount', NEW.amount * 100
      )
    );
  END IF;
  
  -- Notify user when deposit is completed
  IF NEW.type = 'deposit' AND NEW.payment_status = 'completed' AND TG_OP = 'UPDATE' AND OLD.payment_status != 'completed' THEN
    PERFORM send_push_notification(
      NEW.user_id,
      '✅ Deposit Successful',
      'Your deposit of ₦' || (NEW.amount * 100)::TEXT || ' is now available',
      jsonb_build_object(
        'type', 'deposit',
        'amount', NEW.amount * 100
      )
    );
  END IF;
  
  -- Notify scholar when withdrawal is completed
  IF NEW.type = 'withdrawal' AND NEW.payment_status = 'completed' AND TG_OP = 'UPDATE' AND OLD.payment_status != 'completed' THEN
    PERFORM send_push_notification(
      NEW.user_id,
      '✅ Withdrawal Successful',
      '₦' || (NEW.amount * 100)::TEXT || ' has been sent to your bank account',
      jsonb_build_object(
        'type', 'withdrawal',
        'amount', NEW.amount * 100
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_coin_transaction ON masjid_coin_transactions;
CREATE TRIGGER trigger_notify_coin_transaction
AFTER INSERT OR UPDATE ON masjid_coin_transactions
FOR EACH ROW
EXECUTE FUNCTION notify_coin_transaction();

-- =====================================================
-- REEL NOTIFICATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION notify_reel_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reel_creator_id UUID;
  v_liker_name TEXT;
  v_total_likes INTEGER;
BEGIN
  -- Get reel creator
  SELECT user_id INTO v_reel_creator_id
  FROM reels
  WHERE id = NEW.reel_id;
  
  -- Get liker name
  SELECT full_name INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Count total likes
  SELECT COUNT(*) INTO v_total_likes
  FROM reel_likes
  WHERE reel_id = NEW.reel_id;
  
  -- Notify creator (only every 5 likes to avoid spam)
  IF v_total_likes % 5 = 0 AND NEW.user_id != v_reel_creator_id THEN
    PERFORM send_push_notification(
      v_reel_creator_id,
      '❤️ Your Reel is Popular!',
      'Your reel reached ' || v_total_likes || ' likes!',
      jsonb_build_object(
        'type', 'reel_likes',
        'reel_id', NEW.reel_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_reel_interaction ON reel_likes;
CREATE TRIGGER trigger_notify_reel_interaction
AFTER INSERT ON reel_likes
FOR EACH ROW
EXECUTE FUNCTION notify_reel_interaction();

-- =====================================================
-- Grant necessary permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated;
GRANT EXECUTE ON FUNCTION send_push_notification TO service_role;

-- =====================================================
-- Indexes for better notification query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_streams_scholar_active ON streams(scholar_id, is_active);
CREATE INDEX IF NOT EXISTS idx_consultation_bookings_scholar ON consultation_bookings(scholar_id, scholar_accepted);
CREATE INDEX IF NOT EXISTS idx_consultation_messages_booking ON consultation_messages(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_comments_stream ON stream_comments(stream_id, created_at DESC);

COMMENT ON FUNCTION send_push_notification IS 'Send push notification to user via FCM';
COMMENT ON FUNCTION notify_stream_start IS 'Notify followers when scholar starts livestream';
COMMENT ON FUNCTION notify_stream_comment IS 'Notify scholar of new comment on their stream';
COMMENT ON FUNCTION notify_consultation_booked IS 'Notify scholar when consultation is booked';
COMMENT ON FUNCTION notify_consultation_accepted IS 'Notify member when scholar accepts consultation';
COMMENT ON FUNCTION notify_consultation_message IS 'Notify other party of new consultation message';
COMMENT ON FUNCTION notify_coin_transaction IS 'Notify users of coin transactions';
COMMENT ON FUNCTION notify_reel_interaction IS 'Notify reel creator of likes';
