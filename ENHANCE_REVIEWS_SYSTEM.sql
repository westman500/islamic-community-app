-- ============================================================================
-- ENHANCE SCHOLAR REVIEWS SYSTEM
-- ============================================================================
-- Allows reviews after both consultations AND livestreams
-- Ensures proper star rating calculations

-- ============================================================================
-- STEP 1: Update scholar_reviews table to support both consultations and livestreams
-- ============================================================================

-- Add optional stream_id column (either consultation_id OR stream_id must be set)
ALTER TABLE scholar_reviews 
ADD COLUMN IF NOT EXISTS stream_id UUID REFERENCES streams(id) ON DELETE CASCADE;

-- Drop old unique constraint (was consultation-only)
ALTER TABLE scholar_reviews 
DROP CONSTRAINT IF EXISTS scholar_reviews_scholar_id_reviewer_id_consultation_id_key;

-- Add new check constraint to ensure either consultation_id OR stream_id is set (but not both)
ALTER TABLE scholar_reviews
DROP CONSTRAINT IF EXISTS check_review_source;

ALTER TABLE scholar_reviews
ADD CONSTRAINT check_review_source CHECK (
    (consultation_id IS NOT NULL AND stream_id IS NULL) OR
    (consultation_id IS NULL AND stream_id IS NOT NULL)
);

-- Add new unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS unique_review_per_consultation
ON scholar_reviews (scholar_id, reviewer_id, consultation_id)
WHERE consultation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_review_per_stream
ON scholar_reviews (scholar_id, reviewer_id, stream_id)
WHERE stream_id IS NOT NULL;

-- Add index for stream reviews
CREATE INDEX IF NOT EXISTS idx_scholar_reviews_stream ON scholar_reviews(stream_id) WHERE stream_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Update RLS policies to allow reviews after livestreams
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can create reviews after consultation" ON scholar_reviews;

-- Create new comprehensive policy
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

-- ============================================================================
-- STEP 3: Update trigger to properly calculate ratings
-- ============================================================================

-- Drop and recreate the rating update function with better logic
DROP TRIGGER IF EXISTS scholar_rating_update ON scholar_reviews;
DROP FUNCTION IF EXISTS update_scholar_rating();

CREATE OR REPLACE FUNCTION update_scholar_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_scholar_id UUID;
    calculated_average NUMERIC(3,2);
    calculated_count INTEGER;
BEGIN
    -- Get the scholar ID from either NEW or OLD record
    target_scholar_id := COALESCE(NEW.scholar_id, OLD.scholar_id);
    
    -- Calculate the average rating for this scholar
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

-- Recreate trigger
CREATE TRIGGER scholar_rating_update
AFTER INSERT OR UPDATE OR DELETE ON scholar_reviews
FOR EACH ROW
EXECUTE FUNCTION update_scholar_rating();

-- ============================================================================
-- STEP 4: Recalculate all existing ratings to ensure accuracy
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
-- STEP 5: Verification query
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

SELECT '✅ REVIEW SYSTEM ENHANCED!' as status,
       'Reviews can now be submitted after consultations AND livestreams' as message,
       'Star ratings are calculated accurately with proper rounding' as note;
