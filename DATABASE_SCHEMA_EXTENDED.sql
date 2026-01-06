-- ============================================================================
-- EXTENDED DATABASE SCHEMA FOR ISLAMIC COMMUNITY PLATFORM
-- New Features: Reactions, Reporting, Blocking, Subscriptions, Paid Streams,
--               Messaging, Notifications, Verification, Service Fees
-- ============================================================================

-- ============================================================================
-- 1. UPDATE EXISTING TABLES
-- ============================================================================

-- Add new columns to streams table
ALTER TABLE streams ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Add new columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certificate_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smileid_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_consultations_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_description TEXT;

-- Add new columns to consultations table
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS actual_ended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS time_extended_minutes INTEGER DEFAULT 0;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC DEFAULT 0;

-- Add new columns to donations table
ALTER TABLE donations ADD COLUMN IF NOT EXISTS service_fee_amount NUMERIC DEFAULT 0;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS net_amount NUMERIC;

-- ============================================================================
-- 2. STREAM REACTIONS TABLE (Likes/Dislikes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stream_id, user_id) -- One reaction per user per stream
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_stream_reactions_stream ON stream_reactions(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_reactions_user ON stream_reactions(user_id);

-- ============================================================================
-- 3. REPORTS TABLE (User Reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reported_stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('harassment', 'spam', 'inappropriate_content', 'hate_speech', 'violence', 'other')),
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================================================
-- 4. BLOCKED USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id), -- Can't block same user twice
    CHECK (blocker_id != blocked_id) -- Can't block yourself
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ============================================================================
-- 5. STREAM RESTRICTIONS TABLE (Kick/Ban from Stream)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_restrictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scholar_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    restriction_type TEXT NOT NULL CHECK (restriction_type IN ('kick', 'ban')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent ban
    UNIQUE(stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_restrictions_stream ON stream_restrictions(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_restrictions_user ON stream_restrictions(user_id);

-- ============================================================================
-- 6. STREAM ACCESS TABLE (Paid Stream Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_id TEXT, -- External payment gateway ID
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_access_stream ON stream_access(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_access_user ON stream_access(user_id);

-- ============================================================================
-- 7. SUBSCRIPTIONS TABLE (Scholar Subscriptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'scholar_monthly',
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- 8. MESSAGES TABLE (Consultation Chat)
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'time_extension_request', 'time_extension_approved', 'time_extension_denied')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_consultation ON messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ============================================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'stream_started',
        'stream_ended',
        'consultation_booked',
        'consultation_confirmed',
        'consultation_starting',
        'consultation_ended',
        'message_received',
        'payment_received',
        'subscription_expiring',
        'subscription_expired',
        'verification_completed',
        'report_resolved',
        'time_extension_request',
        'time_extension_approved'
    )),
    related_id UUID, -- ID of related entity (stream, consultation, etc.)
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- Deep link to relevant page
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- 10. VERIFICATION DATA TABLE (SMILEID & Other Verifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN ('phone', 'email', 'face', 'certificate', 'smileid')),
    verification_provider TEXT, -- 'smileid', 'twilio', etc.
    verification_id TEXT, -- External verification ID
    data JSONB, -- Store verification metadata
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_data_user ON verification_data(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_data_type ON verification_data(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_data_status ON verification_data(status);

-- ============================================================================
-- 11. TIME EXTENSION REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_extension_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    additional_minutes INTEGER NOT NULL,
    additional_cost NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE -- Request expires if not responded
);

CREATE INDEX IF NOT EXISTS idx_time_extensions_consultation ON time_extension_requests(consultation_id);
CREATE INDEX IF NOT EXISTS idx_time_extensions_status ON time_extension_requests(status);

-- ============================================================================
-- 12. SCHOLAR/IMAM RATINGS & REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scholar_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scholar_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scholar_id, reviewer_id, consultation_id) -- One review per consultation
);

CREATE INDEX IF NOT EXISTS idx_scholar_reviews_scholar ON scholar_reviews(scholar_id);
CREATE INDEX IF NOT EXISTS idx_scholar_reviews_reviewer ON scholar_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_scholar_reviews_rating ON scholar_reviews(rating);

-- ============================================================================
-- 13. STREAM PARTICIPANTS TABLE (Track who joined each stream)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stream_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_participants_stream ON stream_participants(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_participants_user ON stream_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_participants_active ON stream_participants(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE stream_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_extension_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholar_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_participants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STREAM REACTIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view all reactions"
    ON stream_reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can create their own reactions"
    ON stream_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
    ON stream_reactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
    ON stream_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own reports"
    ON reports FOR SELECT
    USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

-- ============================================================================
-- BLOCKED USERS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own blocks"
    ON blocked_users FOR SELECT
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
    ON blocked_users FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
    ON blocked_users FOR DELETE
    USING (auth.uid() = blocker_id);

-- ============================================================================
-- STREAM RESTRICTIONS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view stream restrictions"
    ON stream_restrictions FOR SELECT
    USING (true);

CREATE POLICY "Scholars can create restrictions on their streams"
    ON stream_restrictions FOR INSERT
    WITH CHECK (
        auth.uid() = scholar_id AND
        EXISTS (
            SELECT 1 FROM streams
            WHERE id = stream_id AND scholar_id = auth.uid()
        )
    );

-- ============================================================================
-- STREAM ACCESS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own stream access"
    ON stream_access FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create stream access"
    ON stream_access FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

CREATE POLICY "Users can view messages in their consultations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM consultations
            WHERE id = consultation_id
            AND (user_id = auth.uid() OR scholar_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their consultations"
    ON messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM consultations
            WHERE id = consultation_id
            AND (user_id = auth.uid() OR scholar_id = auth.uid())
        )
    );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION DATA POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own verification data"
    ON verification_data FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- TIME EXTENSION REQUESTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view time extensions for their consultations"
    ON time_extension_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM consultations
            WHERE id = consultation_id
            AND (user_id = auth.uid() OR scholar_id = auth.uid())
        )
    );

CREATE POLICY "Users can create time extension requests"
    ON time_extension_requests FOR INSERT
    WITH CHECK (auth.uid() = requested_by);

-- ============================================================================
-- SCHOLAR REVIEWS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view scholar reviews"
    ON scholar_reviews FOR SELECT
    USING (true);

CREATE POLICY "Users can create reviews after consultation"
    ON scholar_reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM consultations
            WHERE id = consultation_id
            AND user_id = auth.uid()
            AND status = 'completed'
        )
    );

CREATE POLICY "Users can update their own reviews"
    ON scholar_reviews FOR UPDATE
    USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews"
    ON scholar_reviews FOR DELETE
    USING (auth.uid() = reviewer_id);

-- ============================================================================
-- STREAM PARTICIPANTS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view stream participants"
    ON stream_participants FOR SELECT
    USING (true);

CREATE POLICY "Users can join streams"
    ON stream_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
    ON stream_participants FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update reaction counts on streams
CREATE OR REPLACE FUNCTION update_stream_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE streams SET
            likes_count = (
                SELECT COUNT(*) FROM stream_reactions
                WHERE stream_id = NEW.stream_id AND reaction_type = 'like'
            ),
            dislikes_count = (
                SELECT COUNT(*) FROM stream_reactions
                WHERE stream_id = NEW.stream_id AND reaction_type = 'dislike'
            )
        WHERE id = NEW.stream_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE streams SET
            likes_count = (
                SELECT COUNT(*) FROM stream_reactions
                WHERE stream_id = OLD.stream_id AND reaction_type = 'like'
            ),
            dislikes_count = (
                SELECT COUNT(*) FROM stream_reactions
                WHERE stream_id = OLD.stream_id AND reaction_type = 'dislike'
            )
        WHERE id = OLD.stream_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reaction counts
DROP TRIGGER IF EXISTS trigger_update_stream_reaction_counts ON stream_reactions;
CREATE TRIGGER trigger_update_stream_reaction_counts
AFTER INSERT OR UPDATE OR DELETE ON stream_reactions
FOR EACH ROW EXECUTE FUNCTION update_stream_reaction_counts();

-- Function to increment completed consultations count
CREATE OR REPLACE FUNCTION increment_completed_consultations()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE profiles
        SET completed_consultations_count = completed_consultations_count + 1
        WHERE id = NEW.scholar_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for completed consultations
DROP TRIGGER IF EXISTS trigger_increment_completed_consultations ON consultations;
CREATE TRIGGER trigger_increment_completed_consultations
AFTER UPDATE ON consultations
FOR EACH ROW EXECUTE FUNCTION increment_completed_consultations();

-- Function to calculate service fees for imams
CREATE OR REPLACE FUNCTION calculate_service_fee()
RETURNS TRIGGER AS $$
DECLARE
    scholar_role TEXT;
BEGIN
    -- Get the scholar/imam role
    SELECT role INTO scholar_role
    FROM profiles
    WHERE id = NEW.scholar_id;
    
    -- Apply 3% fee for imams
    IF scholar_role = 'imam' THEN
        IF TG_TABLE_NAME = 'consultations' THEN
            NEW.service_fee_amount := NEW.price * 0.03;
        ELSIF TG_TABLE_NAME = 'donations' THEN
            NEW.service_fee_amount := NEW.amount * 0.03;
            NEW.net_amount := NEW.amount - NEW.service_fee_amount;
        END IF;
    ELSE
        NEW.service_fee_amount := 0;
        IF TG_TABLE_NAME = 'donations' THEN
            NEW.net_amount := NEW.amount;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for service fee calculation
DROP TRIGGER IF EXISTS trigger_calculate_consultation_fee ON consultations;
CREATE TRIGGER trigger_calculate_consultation_fee
BEFORE INSERT OR UPDATE ON consultations
FOR EACH ROW EXECUTE FUNCTION calculate_service_fee();

DROP TRIGGER IF EXISTS trigger_calculate_donation_fee ON donations;
CREATE TRIGGER trigger_calculate_donation_fee
BEFORE INSERT OR UPDATE ON donations
FOR EACH ROW EXECUTE FUNCTION calculate_service_fee();

-- Function to update scholar average rating
CREATE OR REPLACE FUNCTION update_scholar_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles SET
        average_rating = (
            SELECT AVG(rating)::NUMERIC(3,2) FROM scholar_reviews
            WHERE scholar_id = COALESCE(NEW.scholar_id, OLD.scholar_id)
        ),
        total_ratings = (
            SELECT COUNT(*) FROM scholar_reviews
            WHERE scholar_id = COALESCE(NEW.scholar_id, OLD.scholar_id)
        )
    WHERE id = COALESCE(NEW.scholar_id, OLD.scholar_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for rating updates
DROP TRIGGER IF EXISTS trigger_update_scholar_rating ON scholar_reviews;
CREATE TRIGGER trigger_update_scholar_rating
AFTER INSERT OR UPDATE OR DELETE ON scholar_reviews
FOR EACH ROW EXECUTE FUNCTION update_scholar_rating();

-- Function to update stream viewer count from participants
CREATE OR REPLACE FUNCTION update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE streams SET
            viewer_count = (
                SELECT COUNT(*) FROM stream_participants
                WHERE stream_id = NEW.stream_id AND is_active = true
            )
        WHERE id = NEW.stream_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE streams SET
            viewer_count = (
                SELECT COUNT(*) FROM stream_participants
                WHERE stream_id = OLD.stream_id AND is_active = true
            )
        WHERE id = OLD.stream_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for viewer count updates
DROP TRIGGER IF EXISTS trigger_update_stream_viewer_count ON stream_participants;
CREATE TRIGGER trigger_update_stream_viewer_count
AFTER INSERT OR UPDATE OR DELETE ON stream_participants
FOR EACH ROW EXECUTE FUNCTION update_stream_viewer_count();

-- Function to handle account deletion (cascade delete all user data)
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Delete will cascade to all related tables via ON DELETE CASCADE
    DELETE FROM profiles WHERE id = user_id_to_delete;
    
    -- Also delete auth user (requires service_role key)
    -- This should be called from an Edge Function with service_role permissions
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting user: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NOTIFICATION FUNCTIONS
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
-- ============================================================================
-- All new tables and policies have been created.
-- Run this SQL in Supabase SQL Editor to extend your database.
-- ============================================================================
