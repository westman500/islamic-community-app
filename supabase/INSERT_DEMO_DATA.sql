-- =====================================================================
-- INSERT DEMO DATA FOR ISLAMIC COMMUNITY APP
-- Run this in Supabase SQL Editor to populate test data
-- =====================================================================

-- ============================================
-- 1. DEMO ACTIVITIES (Islamic Events)
-- ============================================

-- Create activities table if not exists
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text NOT NULL, -- 'education', 'charity', 'community', 'worship', 'youth'
  organizer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  location text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  image_url text,
  max_participants integer,
  current_participants integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active activities" ON public.activities
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

-- Insert demo activities
INSERT INTO public.activities (title, description, category, location, start_time, end_time, image_url, max_participants) VALUES
('Quran Tafsir Class', 'Weekly Quran interpretation session with Sheikh Muhammad. Join us to deepen your understanding of the Holy Quran.', 'education', 'Main Prayer Hall', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours', 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800', 50),
('Youth Islamic Quiz Competition', 'Test your knowledge of Islamic history, Quran, and Hadith. Prizes for top 3 winners!', 'youth', 'Community Center', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 3 hours', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800', 100),
('Charity Drive: Feed the Needy', 'Monthly food distribution program for underprivileged families. Volunteers needed!', 'charity', 'Masjid Parking Lot', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 4 hours', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800', 30),
('Arabic Language Course - Beginner', 'Learn to read and speak Arabic. Perfect for those starting their Islamic studies journey.', 'education', 'Classroom A', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 1.5 hours', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800', 25),
('Community Iftar (Breaking Fast)', 'Join us for a communal breaking of fast during Ramadan. All are welcome!', 'community', 'Main Hall', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', 'https://images.unsplash.com/photo-1565299715199-866c917206bb?w=800', 200),
('Sisters Study Circle', 'Islamic knowledge session exclusively for sisters. Topic: Women in Islamic History', 'education', 'Sisters Prayer Room', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 2 hours', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800', 40),
('Tahajjud Prayer Night', 'Special night prayer session. Experience the blessing of praying in the last third of the night.', 'worship', 'Main Prayer Hall', NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days 2 hours', 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800', 100),
('Islamic Finance Workshop', 'Learn about Halal investing, Zakat calculation, and ethical business practices in Islam.', 'education', 'Conference Room', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days 3 hours', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800', 60);

-- ============================================
-- 2. HALAL RESTAURANTS
-- ============================================

-- Create restaurants table
CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  cuisine_type text, -- 'Middle Eastern', 'Pakistani', 'Turkish', 'Mediterranean', etc.
  address text NOT NULL,
  phone text,
  halal_certified boolean DEFAULT true,
  certificate_url text,
  rating numeric(2,1) DEFAULT 0,
  price_range text, -- '$', '$$', '$$$', '$$$$'
  image_url text,
  opening_hours jsonb,
  delivery_available boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Anyone can view active restaurants" ON public.restaurants
  FOR SELECT USING (is_active = true);

-- Insert demo restaurants
INSERT INTO public.restaurants (name, description, cuisine_type, address, phone, halal_certified, rating, price_range, image_url, delivery_available, opening_hours) VALUES
('Al-Barakah Grill', 'Authentic Middle Eastern cuisine with a modern twist. Famous for our shawarma and mixed grill platters.', 'Middle Eastern', '123 Main Street, Lagos', '+234-801-234-5678', true, 4.7, '$$', 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800', true, '{"monday": "10:00-22:00", "tuesday": "10:00-22:00", "wednesday": "10:00-22:00", "thursday": "10:00-22:00", "friday": "14:00-23:00", "saturday": "10:00-23:00", "sunday": "10:00-22:00"}'),
('Bismillah Biryani House', 'Traditional Pakistani and Indian cuisine. Best biryani in town, prepared with love and halal ingredients.', 'Pakistani', '456 Market Road, Abuja', '+234-802-345-6789', true, 4.9, '$', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', true, '{"monday": "11:00-21:00", "tuesday": "11:00-21:00", "wednesday": "11:00-21:00", "thursday": "11:00-21:00", "friday": "12:00-22:00", "saturday": "11:00-22:00", "sunday": "11:00-21:00"}'),
('Sultan Turkish Kitchen', 'Experience the flavors of Turkey with our kebabs, pide, and baklava. Family-friendly atmosphere.', 'Turkish', '789 Independence Avenue, Port Harcourt', '+234-803-456-7890', true, 4.6, '$$$', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800', false, '{"monday": "12:00-23:00", "tuesday": "12:00-23:00", "wednesday": "12:00-23:00", "thursday": "12:00-23:00", "friday": "13:00-00:00", "saturday": "12:00-00:00", "sunday": "12:00-23:00"}'),
('Halal Burger Spot', 'American-style burgers and fries, 100% halal beef. Perfect for a quick meal after prayers.', 'American', '321 Shopping Plaza, Kano', '+234-804-567-8901', true, 4.4, '$', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', true, '{"monday": "09:00-21:00", "tuesday": "09:00-21:00", "wednesday": "09:00-21:00", "thursday": "09:00-21:00", "friday": "09:00-22:00", "saturday": "09:00-22:00", "sunday": "09:00-21:00"}'),
('Noor Mediterranean Cafe', 'Fresh Mediterranean dishes, vegetarian options available. Great for casual dining with family.', 'Mediterranean', '654 University Road, Ibadan', '+234-805-678-9012', true, 4.8, '$$', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800', true, '{"monday": "10:00-20:00", "tuesday": "10:00-20:00", "wednesday": "10:00-20:00", "thursday": "10:00-20:00", "friday": "10:00-21:00", "saturday": "10:00-21:00", "sunday": "10:00-20:00"}'),
('Yemeni Mandi Palace', 'Specialized in Yemeni Mandi rice and lamb. Authentic flavors from the Arabian Peninsula.', 'Yemeni', '987 Central Business District, Lagos', '+234-806-789-0123', true, 4.5, '$$$', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800', false, '{"monday": "12:00-22:00", "tuesday": "12:00-22:00", "wednesday": "12:00-22:00", "thursday": "12:00-22:00", "friday": "13:00-23:00", "saturday": "12:00-23:00", "sunday": "12:00-22:00"}');

-- ============================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS activities_category_idx ON public.activities(category);
CREATE INDEX IF NOT EXISTS activities_start_time_idx ON public.activities(start_time);
CREATE INDEX IF NOT EXISTS activities_is_active_idx ON public.activities(is_active);

CREATE INDEX IF NOT EXISTS restaurants_cuisine_idx ON public.restaurants(cuisine_type);
CREATE INDEX IF NOT EXISTS restaurants_rating_idx ON public.restaurants(rating DESC);
CREATE INDEX IF NOT EXISTS restaurants_is_active_idx ON public.restaurants(is_active);

-- ============================================
-- 4. ADD TO REALTIME (OPTIONAL)
-- ============================================

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;

-- Success message
SELECT '✅ Demo data inserted successfully!' AS status,
       (SELECT COUNT(*) FROM public.activities) AS activities_count,
       (SELECT COUNT(*) FROM public.restaurants) AS restaurants_count;
