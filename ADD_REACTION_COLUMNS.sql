-- Add likes_count and dislikes_count columns to streams table

-- Add columns if they don't exist
ALTER TABLE public.streams 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;

-- Update existing streams to have 0 counts
UPDATE public.streams 
SET likes_count = 0, dislikes_count = 0 
WHERE likes_count IS NULL OR dislikes_count IS NULL;

-- Verify columns added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'streams' 
AND column_name IN ('likes_count', 'dislikes_count');
