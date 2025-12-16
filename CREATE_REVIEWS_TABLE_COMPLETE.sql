-- ============================================================================
-- CREATE AND ENHANCE SCHOLAR REVIEWS SYSTEM - COMPLETE
-- ============================================================================
-- This script creates the scholar_reviews table from scratch with support for
-- both consultations AND livestreams, with accurate star rating calculations.
-- Run this FIRST if the scholar_reviews table doesn't exist yet.

-- ============================================================================
-- STEP 1: Create scholar_reviews table with support for both sources
-- ============================================================================

CREATE TABLE IF NOT EXISTS scholar_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scholar_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure either consultation_id OR stream_id is set (but not both or neither)
    CONSTRAINT check_review_source CHECK (
        (consultation_id IS NOT NULL AND stream_id IS NULL) OR
        (consultation_id IS NULL AND stream_id IS NOT NULL)
    )
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- General indexes
CREATE INDEX IF NOT EXISTS idx_scholar_reviews_scholar ON scholar_reviews(scholar_id);
CREATE INDEX IF NOT EXISTS idx_scholar_reviews_rating ON scholar_reviews(rating);

-- Unique indexes for preventing duplicate reviews
CREATE UNIQUE INDEX IF NOT EXISTS unique_review_per_consultation
ON scholar_reviews (scholar_id, reviewer_id, consultation_id)
WHERE consultation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_review_per_stream
ON scholar_reviews (scholar_id, reviewer_id, stream_id)
WHERE stream_id IS NOT NULL;

-- Indexes for stream reviews
CREATE INDEX IF NOT EXISTS idx_scholar_reviews_stream ON scholar_reviews(stream_id) 
WHERE stream_id IS NOT NULL;

-- Index for consultation reviews
CREATE INDEX IF NOT EXISTS idx_scholar_reviews_consultation ON scholar_reviews(consultation_id) 
WHERE consultation_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Enable RLS and create policies
-- ============================================================================

ALTER TABLE scholar_reviews ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON scholar_reviews;
DROP POLICY IF EXISTS "Users can create reviews after consultation" ON scholar_reviews;
DROP POLICY IF EXISTS "Users can create reviews after consultation or livestream" ON scholar_reviews;
DROP POLICY IF EXISTS "Reviewers can update own reviews" ON scholar_reviews;
DROP POLICY IF EXISTS "Reviewers can delete own reviews" ON scholar_reviews;

-- Allow anyone to view reviews
CREATE POLICY "Anyone can view reviews" ON scholar_reviews 
FOR SELECT USING (true);

-- Allow reviews after consultation OR livestream
CREATE POLICY "Users can create reviews after consultation or livestream" ON scholar_reviews 
FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    (
        -- Allow review after completed consultation
        (consultation_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM consultations 
            WHERE consultations.id = consultation_id 
            AND consultations.user_id = auth.uid()
            AND consultations.status = 'completed'
            AND consultations.actual_ended_at IS NOT NULL
        ))
        OR
        -- Allow review after ended livestream that user attended
        (stream_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM streams
            WHERE streams.id = stream_id
            AND streams.is_active = false
            AND streams.ended_at IS NOT NULL
            AND streams.ended_at < NOW()
            AND EXISTS (
                SELECT 1 FROM stream_participants
                WHERE stream_participants.stream_id = stream_id
                AND stream_participants.user_id = auth.uid()
            )
        ))
    )
);

-- Allow users to update their own reviews
CREATE POLICY "Reviewers can update own reviews" ON scholar_reviews 
FOR UPDATE USING (auth.uid() = reviewer_id);

-- Allow users to delete their own reviews
CREATE POLICY "Reviewers can delete own reviews" ON scholar_reviews 
FOR DELETE USING (auth.uid() = reviewer_id);

-- ============================================================================
-- STEP 4: Create trigger function for automatic rating calculation
-- ============================================================================

-- Drop existing triggers (but NOT the shared functions)
DROP TRIGGER IF EXISTS scholar_rating_update ON scholar_reviews;
DROP TRIGGER IF EXISTS update_scholar_reviews_updated_at ON scholar_reviews;

-- Drop only the scholar_rating function (it's specific to scholar_reviews)
DROP FUNCTION IF EXISTS update_scholar_rating();

-- Create function to update scholar ratings with proper rounding
CREATE OR REPLACE FUNCTION update_scholar_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_scholar_id UUID;
    calculated_average NUMERIC(3,2);
    calculated_count INTEGER;
BEGIN
    -- Get the scholar ID from either NEW or OLD record
    target_scholar_id := COALESCE(NEW.scholar_id, OLD.scholar_id);
    
    -- Calculate the average rating for this scholar with proper rounding
    SELECT 
        COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0),
        COUNT(*)
    INTO calculated_average, calculated_count
    FROM scholar_reviews
    WHERE scholar_id = target_scholar_id;
    
    -- Update the scholar's profile with accurate rating data
    UPDATE profiles
    SET 
        average_rating = calculated_average,
        total_ratings = calculated_count,
        updated_at = NOW()
    WHERE id = target_scholar_id;
    
    -- Log the update for debugging
    RAISE NOTICE '✅ Updated scholar % ratings: Average=%, Count=%', 
        target_scholar_id, calculated_average, calculated_count;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create shared function to auto-update updated_at timestamp (if not exists)
-- This function is used by multiple tables, so use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER scholar_rating_update
AFTER INSERT OR UPDATE OR DELETE ON scholar_reviews
FOR EACH ROW
EXECUTE FUNCTION update_scholar_rating();

CREATE TRIGGER update_scholar_reviews_updated_at
BEFORE UPDATE ON scholar_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: Recalculate all existing scholar ratings (if any reviews exist)
-- ============================================================================

DO $$
DECLARE
    scholar_record RECORD;
    calculated_avg NUMERIC(3,2);
    calculated_total INTEGER;
BEGIN
    FOR scholar_record IN 
        SELECT id, full_name, role 
        FROM profiles 
        WHERE role IN ('scholar', 'imam')
    LOOP
        -- Calculate accurate rating from reviews
        SELECT 
            COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0),
            COUNT(*)
        INTO calculated_avg, calculated_total
        FROM scholar_reviews
        WHERE scholar_id = scholar_record.id;
        
        -- Update profile
        UPDATE profiles
        SET 
            average_rating = calculated_avg,
            total_ratings = calculated_total,
            updated_at = NOW()
        WHERE id = scholar_record.id;
        
        RAISE NOTICE '✅ Recalculated ratings for % (%): Avg=%, Total=%', 
            scholar_record.full_name, 
            scholar_record.role,
            calculated_avg,
            calculated_total;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 6: Verification query
-- ============================================================================

-- Show all scholars with their ratings
SELECT 
    p.full_name,
    p.role,
    p.average_rating,
    p.total_ratings,
    -- Verify against actual reviews
    COALESCE(ROUND(AVG(sr.rating)::NUMERIC, 2), 0) as actual_average,
    COUNT(sr.id) as actual_count,
    CASE 
        WHEN p.average_rating = COALESCE(ROUND(AVG(sr.rating)::NUMERIC, 2), 0) 
        THEN '✅ CORRECT'
        ELSE '❌ MISMATCH'
    END as status
FROM profiles p
LEFT JOIN scholar_reviews sr ON sr.scholar_id = p.id
WHERE p.role IN ('scholar', 'imam')
GROUP BY p.id, p.full_name, p.role, p.average_rating, p.total_ratings
ORDER BY p.full_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ SCHOLAR REVIEWS TABLE CREATED SUCCESSFULLY!' as status,
       'Reviews can be submitted after consultations AND livestreams' as message,
       'Star ratings are calculated accurately with proper rounding to 2 decimals' as note;
