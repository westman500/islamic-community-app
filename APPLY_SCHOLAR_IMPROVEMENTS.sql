-- ============================================================================
-- SCHOLAR IMPROVEMENTS - Add Years of Experience & Consultation Descriptions
-- ============================================================================

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_description TEXT;

-- ============================================================================
-- NOTIFICATION FUNCTIONS FOR BROADCASTING TO ALL MEMBERS
-- ============================================================================

-- Function to notify all members when a scholar/imam goes live
CREATE OR REPLACE FUNCTION notify_all_members_livestream(p_scholar_id UUID, p_scholar_name TEXT, p_stream_title TEXT)
RETURNS VOID AS $$
DECLARE
  v_token TEXT;
  v_user_id UUID;
BEGIN
  -- Get all members with push tokens
  FOR v_user_id, v_token IN 
    SELECT id, push_token 
    FROM profiles 
    WHERE role = 'user' 
    AND push_token IS NOT NULL 
    AND push_token != ''
  LOOP
    -- Insert notification record for tracking
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'livestream',
      '🎥 Livestream Starting!',
      p_scholar_name || ' is going live: "' || p_stream_title || '"',
      json_build_object('scholarId', p_scholar_id, 'scholarName', p_scholar_name, 'streamTitle', p_stream_title)::jsonb
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify all members when scholar becomes available for consultation
CREATE OR REPLACE FUNCTION notify_all_members_scholar_online(p_scholar_id UUID, p_scholar_name TEXT, p_description TEXT)
RETURNS VOID AS $$
DECLARE
  v_token TEXT;
  v_user_id UUID;
BEGIN
  -- Get all members with push tokens
  FOR v_user_id, v_token IN 
    SELECT id, push_token 
    FROM profiles 
    WHERE role = 'user' 
    AND push_token IS NOT NULL 
    AND push_token != ''
  LOOP
    -- Insert notification record
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'scholar_online',
      '📚 Scholar Available!',
      p_scholar_name || ' is now available for consultation. ' || p_description,
      json_build_object('scholarId', p_scholar_id, 'scholarName', p_scholar_name, 'description', p_description)::jsonb
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMPLETED!
-- Apply this SQL in Supabase Dashboard SQL Editor
-- ============================================================================
