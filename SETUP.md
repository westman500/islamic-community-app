# 🕌 Islamic Community Platform - Masjid

A comprehensive Islamic community platform built with React, TypeScript, and Vite. Features include prayer times, Quran reader, Qibla direction, live streaming for scholars/imams, consultation booking, and Zakat donations.

## 🎯 Features

### For All Users
- **Prayer Times**: Real-time prayer times based on location with countdown
- **Quran Reader**: Complete Quran with Arabic text, English translation, and audio playback
- **Qibla Direction**: Real-time compass pointing to Kaaba in Makkah

### For Members (Users)
- **Watch Live Streams**: Join prayer services and Islamic lectures
- **Zakat Donations**: Donate to scholars and imams
- **Book Consultations**: Schedule private consultations with scholars

### For Scholars & Imams
- **Live Streaming**: Start and manage live prayer services and lectures
- **Manage Consultations**: View, confirm, and manage consultation bookings
- **Cannot**: Donate Zakat or book consultations (role-based restrictions)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for backend/auth)
- Agora account (for live streaming)

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Setup environment variables**
```bash
# Copy the example file
copy .env.example .env

# Edit .env and add your credentials:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_AGORA_APP_ID
```

3. **Run development server**
```bash
npm run dev
```

4. **Build for production**
```bash
npm run build
```

## 🔐 Role-Based Access Control

The platform implements strict role-based access:

| Feature | User (Member) | Scholar/Imam | Admin |
|---------|---------------|--------------|-------|
| Prayer Times | ✅ | ✅ | ✅ |
| Quran Reader | ✅ | ✅ | ✅ |
| Qibla Direction | ✅ | ✅ | ✅ |
| Watch Streams | ✅ | ❌ | ✅ |
| Donate Zakat | ✅ | ❌ | ✅ |
| Book Consultations | ✅ | ❌ | ✅ |
| Start Streams | ❌ | ✅ | ✅ |
| Manage Consultations | ❌ | ✅ | ✅ |

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── ProtectedRoute.tsx     # Role-based route protection
│   ├── PrayerTimes.tsx        # Prayer times with location
│   ├── QuranReader.tsx        # Quran with audio
│   ├── QiblaDirection.tsx     # Real-time compass
│   ├── UserSignIn.tsx         # User authentication
│   ├── UserSignUp.tsx         # User registration
│   ├── UserPrayerServiceViewer.tsx    # Watch streams (members only)
│   ├── ZakatDonation.tsx      # Donate (members only)
│   ├── ConsultationBooking.tsx        # Book (members only)
│   ├── ScholarLiveStream.tsx  # Start streams (scholars only)
│   └── ScholarConsultationManager.tsx # Manage bookings (scholars only)
├── contexts/
│   └── AuthContext.tsx        # Authentication & user state
├── utils/
│   ├── agora.ts              # Video streaming utilities
│   ├── prayerTimes.ts        # Prayer time calculations
│   └── supabase/
│       └── client.tsx        # Supabase client & API calls
└── App.tsx                   # Main app with routing
```

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Radix UI components
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Live Streaming**: Agora RTC SDK
- **Prayer Times**: adhan library
- **Quran API**: api.alquran.cloud

## 📝 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🔑 Environment Variables

Required variables in `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AGORA_APP_ID=your_agora_app_id
```

## 🗄️ Database Setup

Create the following tables in Supabase:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'scholar', 'imam', 'admin')),
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

## 🚦 Routes

### Public Routes
- `/signin` - User sign in
- `/signup` - User registration

### Protected Routes (All Authenticated Users)
- `/prayer-times` - Prayer times
- `/quran` - Quran reader
- `/qibla` - Qibla direction

### Member-Only Routes
- `/watch-stream` - Watch live streams
- `/donate` - Zakat donations
- `/book-consultation` - Book consultations

### Scholar/Imam-Only Routes
- `/start-stream` - Start live stream
- `/manage-consultations` - Manage bookings

## 📄 License

MIT License - feel free to use this project for your Islamic community.

## 🕋 May Allah Accept This Work

Built with the intention of serving the Muslim community. Alhamdulillah.
