# 🚀 Quick Setup Guide - Fix Wallet & Scholar Booking

## Current Issues
1. ❌ Scholar Wallet shows error: `masjid_coin_balance` column missing
2. ❌ Consultation booking shows no scholars: missing columns in database

## ✅ Solution: Run Database Setup

### Step 1: Apply Database Migration

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to SQL Editor**: Project → SQL Editor
3. **Copy the entire contents** of: `supabase/COMPLETE_DATABASE_SETUP.sql`
4. **Paste into SQL Editor** and click **RUN**
5. **Verify success**: You should see:
   - Several "Success" messages
   - A table showing your profiles with new columns
   - Scholar count summary
   - Final message: "Database setup complete! ✅"

### Step 2: Create Test Scholar Account

**Option A - Quick Test (Recommended)**
```sql
-- Make your current account a scholar temporarily
UPDATE profiles 
SET role = 'scholar', 
    consultation_fee = 2500,
    livestream_fee = 5000,
    is_online = true
WHERE email = 'ssl4live@gmail.com';
```

Then:
1. Refresh the app
2. Go to Profile Settings → Set any additional fees
3. Navigate to Scholar Wallet → Verify it loads (balance will be ₦0)
4. Switch back to member to test booking:
```sql
UPDATE profiles 
SET role = 'member' 
WHERE email = 'ssl4live@gmail.com';
```

**Option B - Create Dedicated Scholar Account**
1. Sign out from current account
2. Sign up with new email (e.g., `testscholar@example.com`)
3. Run this SQL:
```sql
UPDATE profiles 
SET role = 'scholar',
    consultation_fee = 2500,
    is_online = true
WHERE email = 'testscholar@example.com';
```

### Step 3: Test Complete Flow

1. **As Member**:
   - Navigate to "Consultation Booking"
   - Verify scholars appear with pricing
   - Book a consultation
   - Complete Paystack test payment
   - Check "My Bookings" for confirmed booking

2. **As Scholar**:
   - Navigate to "Scholar Wallet"
   - Verify wallet loads without errors
   - Check "Manage Consultations"
   - Confirm/complete bookings

## 📋 What the Migration Does

### Adds Columns to `profiles` table:
- `masjid_coin_balance` → Stores wallet balance (₦)
- `is_online` → Scholar availability status
- `consultation_fee` → Fee for text consultations
- `livestream_fee` → Fee for livestream sessions
- `live_consultation_fee` → Fee for live video consultations
- `available_slots` → Time slots for bookings

### Creates Performance Indexes:
- Fast queries for online scholars
- Optimized scholar listings by fee

### Applies RLS Policies:
- Members can read scholar profiles
- Users can read own profile data

## 🔍 Troubleshooting

**Issue**: "column does not exist" errors persist
- **Fix**: Clear browser cache and refresh app

**Issue**: Wallet still shows error
- **Fix**: Verify migration ran successfully by checking:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='profiles' 
  AND column_name IN ('masjid_coin_balance', 'is_online', 'consultation_fee');
```
Should return 3 rows.

**Issue**: No scholars visible after setup
- **Fix**: Verify at least one user has `role='scholar'` AND `consultation_fee > 0`
```sql
SELECT id, email, role, consultation_fee 
FROM profiles 
WHERE role IN ('scholar', 'imam') AND consultation_fee > 0;
```

## 📝 Next Steps After Setup

1. Test full booking flow with test payment
2. Verify realtime updates work (open two browser windows)
3. Test wallet balance updates
4. Optional: Build APK for mobile testing
5. Optional: Create multiple scholars for realistic testing
