-- ============================================================================
-- PRODUCTION DEPLOYMENT MIGRATION
-- Islamic Community Platform - Complete Database Schema
-- ============================================================================

-- Run this script in your Supabase SQL Editor or via CLI:
-- supabase db reset (for fresh start)
-- OR apply individual migrations if you have existing data

BEGIN;

-- ============================================================================
-- 1. CORE TABLES (if not exists from initial schema)
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('user', 'scholar', 'imam')) NOT NULL,
    phone_number TEXT,
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    face_verified BOOLEAN DEFAULT false,
    certificate_verified BOOLEAN DEFAULT false,
    smileid_verified BOOLEAN DEFAULT false,
    is_subscribed BOOLEAN DEFAULT false,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    completed_consultations_count INTEGER DEFAULT 0,
    average_rating NUMERIC(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    bio TEXT,
    specializations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Streams table
CREATE TABLE IF NOT EXISTS streams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scholar_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    channel TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    price NUMERIC DEFAULT 0,
    is_free BOOLEAN DEFAULT true,
    viewer_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    dislikes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultations table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    scholar_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    price NUMERIC,
    duration_minutes INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    actual_ended_at TIMESTAMP WITH TIME ZONE,
    time_extended_minutes INTEGER DEFAULT 0,
    service_fee_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    service_fee_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC,
    donation_type TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. NEW FEATURE TABLES
-- ============================================================================

-- Stream reactions (likes/dislikes)
CREATE TABLE IF NOT EXISTS stream_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reaction_type TEXT CHECK (reaction_type IN ('like', 'dislike')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_reactions_stream ON stream_reactions(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_reactions_user ON stream_reactions(user_id);

-- Reports system
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    report_type TEXT CHECK (report_type IN ('harassment', 'inappropriate_content', 'spam', 'other')) NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Blocked users
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscriber_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    subscription_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Stream access (paid streams)
CREATE TABLE IF NOT EXISTS stream_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    amount_paid NUMERIC NOT NULL,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_access_stream ON stream_access(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_access_user ON stream_access(user_id);

-- Messages (consultation chat)
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'system', 'time_extension_request', 'time_extension_approved', 'time_extension_denied')) DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_consultation ON messages(consultation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Time extension requests
CREATE TABLE IF NOT EXISTS time_extension_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    additional_minutes INTEGER NOT NULL,
    additional_cost NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'expired')) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_extensions_consultation ON time_extension_requests(consultation_id);
CREATE INDEX IF NOT EXISTS idx_time_extensions_status ON time_extension_requests(status);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_id UUID,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Verification data (SMILEID)
CREATE TABLE IF NOT EXISTS verification_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    verification_type TEXT CHECK (verification_type IN ('phone', 'email', 'face', 'certificate')) NOT NULL,
    verification_data JSONB,
    status TEXT CHECK (status IN ('pending', 'verified', 'failed')) DEFAULT 'pending',
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, verification_type)
);

CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_data(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_type ON verification_data(verification_type);

-- Access restrictions (kick/ban from streams)
CREATE TABLE IF NOT EXISTS access_restrictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    restricted_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    restriction_type TEXT CHECK (restriction_type IN ('kick', 'ban')) NOT NULL,
    reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restrictions_stream ON access_restrictions(stream_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_user ON access_restrictions(user_id);

-- Scholar reviews (ratings system)
CREATE TABLE IF NOT EXISTS scholar_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scholar_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scholar_id, reviewer_id, consultation_id)
);

CREATE INDEX IF NOT EXISTS idx_scholar_reviews_scholar ON scholar_reviews(scholar_id);
CREATE INDEX IF NOT EXISTS idx_scholar_reviews_rating ON scholar_reviews(rating);

-- Stream participants (viewer tracking)
CREATE TABLE IF NOT EXISTS stream_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_participants_stream ON stream_participants(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_participants_active ON stream_participants(is_active);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_extension_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholar_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_participants ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Streams policies
CREATE POLICY "Active streams viewable by everyone" ON streams FOR SELECT USING (is_active = true);
CREATE POLICY "Scholars can insert own streams" ON streams FOR INSERT WITH CHECK (auth.uid() = scholar_id);
CREATE POLICY "Scholars can update own streams" ON streams FOR UPDATE USING (auth.uid() = scholar_id);

-- Stream reactions policies
CREATE POLICY "Anyone can view reactions" ON stream_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON stream_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reactions" ON stream_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reactions" ON stream_reactions FOR DELETE USING (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Blocked users policies
CREATE POLICY "Users can view own blocks" ON blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block others" ON blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- Consultations policies
CREATE POLICY "Users can view own consultations" ON consultations FOR SELECT USING (auth.uid() = user_id OR auth.uid() = scholar_id);
CREATE POLICY "Users can create consultations" ON consultations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scholars can update consultations" ON consultations FOR UPDATE USING (auth.uid() = scholar_id);

-- Messages policies
CREATE POLICY "Consultation parties can view messages" ON messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM consultations 
        WHERE consultations.id = messages.consultation_id 
        AND (consultations.user_id = auth.uid() OR consultations.scholar_id = auth.uid())
    )
);
CREATE POLICY "Consultation parties can send messages" ON messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM consultations 
        WHERE consultations.id = consultation_id 
        AND (consultations.user_id = auth.uid() OR consultations.scholar_id = auth.uid())
    )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Scholar reviews policies
CREATE POLICY "Anyone can view reviews" ON scholar_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews after consultation" ON scholar_reviews FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
        SELECT 1 FROM consultations 
        WHERE consultations.id = consultation_id 
        AND consultations.user_id = auth.uid()
        AND consultations.status = 'completed'
        AND consultations.actual_ended_at IS NOT NULL
    )
);
CREATE POLICY "Reviewers can update own reviews" ON scholar_reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Reviewers can delete own reviews" ON scholar_reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- Stream participants policies
CREATE POLICY "Anyone can view participants" ON stream_participants FOR SELECT USING (true);
CREATE POLICY "Users can join streams" ON stream_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON stream_participants FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function: Auto-update scholar ratings
CREATE OR REPLACE FUNCTION update_scholar_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0)
            FROM scholar_reviews
            WHERE scholar_id = COALESCE(NEW.scholar_id, OLD.scholar_id)
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM scholar_reviews
            WHERE scholar_id = COALESCE(NEW.scholar_id, OLD.scholar_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.scholar_id, OLD.scholar_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scholar_rating_update
AFTER INSERT OR UPDATE OR DELETE ON scholar_reviews
FOR EACH ROW
EXECUTE FUNCTION update_scholar_rating();

-- Function: Auto-update stream viewer count
CREATE OR REPLACE FUNCTION update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE streams
    SET viewer_count = (
        SELECT COUNT(*)
        FROM stream_participants
        WHERE stream_id = COALESCE(NEW.stream_id, OLD.stream_id)
        AND is_active = true
    )
    WHERE id = COALESCE(NEW.stream_id, OLD.stream_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stream_viewer_count_update
AFTER INSERT OR UPDATE OR DELETE ON stream_participants
FOR EACH ROW
EXECUTE FUNCTION update_stream_viewer_count();

-- Function: Delete user account (CASCADE)
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void AS $$
BEGIN
    -- Delete from profiles (CASCADE handles all foreign keys)
    DELETE FROM profiles WHERE id = user_id_to_delete;
    
    -- Note: auth.users must be deleted separately via Edge Function with service_role
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update profiles updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at
BEFORE UPDATE ON consultations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scholar_reviews_updated_at
BEFORE UPDATE ON scholar_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- 5. INITIAL DATA (Optional - for testing)
-- ============================================================================

-- You can add test users, streams, etc. here if needed

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Deploy Edge Functions: supabase functions deploy
-- 2. Set environment variables in .env.production
-- 3. Build frontend: npm run build
-- 4. Deploy to hosting (Vercel, Netlify, etc.)
-- ============================================================================
