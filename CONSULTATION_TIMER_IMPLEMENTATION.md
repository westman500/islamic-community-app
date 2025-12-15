# ⏰ CONSULTATION TIMER IMPLEMENTATION

## Overview
Added a countdown timer to the consultation chat UI that shows the remaining time for active consultations. The timer accounts for when the consultation actually started, not just the full duration.

## Changes Made

### 1. ConsultationChat.tsx - Timer Logic
**File**: `src/components/ConsultationChat.tsx`

#### Added State:
- `isInitialized`: Tracks if timer has been initialized from database

#### New useEffect - Initialize Timer (lines 48-89):
```typescript
// Fetches consultation_bookings record to check started_at
// If started_at exists: Calculate elapsed time and set remaining time
// If started_at is null: Set started_at to NOW() (first time chat opened)
```

**Logic Flow**:
1. **First time opening chat**: Sets `started_at` timestamp in database
2. **Reopening chat**: Calculates elapsed time since `started_at`
3. **Remaining time**: `total_duration - elapsed_time`
4. **Timer display**: Updates every second via setInterval

#### Example:
- Scholar sets 30-minute consultation
- Chat opens at 2:00 PM → `started_at` = 2:00 PM
- User reopens chat at 2:15 PM → Timer shows **15:00** remaining (not 30:00)

### 2. Database Migration
**File**: `ADD_STARTED_AT_TO_CONSULTATION_BOOKINGS.sql`

```sql
ALTER TABLE consultation_bookings 
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_consultation_bookings_started_at 
  ON consultation_bookings(started_at);
```

**Purpose**: Track when consultation chat was first opened to calculate accurate remaining time.

## Timer Features

### Display (Already Implemented)
- **Location**: Header of chat modal
- **Format**: MM:SS (e.g., "25:30")
- **Colors**:
  - 🟢 Green background: > 5 minutes remaining
  - 🔴 Red background: < 5 minutes remaining
- **Icon**: Clock icon with time display

### Automatic Time Expiration
When timer reaches 0:00:
1. Chat input is disabled
2. Status message shows: "Consultation time has expired"
3. Booking status updated to 'completed' in database
4. User can extend for 15 minutes using 5 Masjid Coins

### Extension Feature (Already Implemented)
- **Cost**: 5 Masjid Coins
- **Duration**: 15 additional minutes
- **Button**: Shows when timer expires (non-scholars only)
- **Process**:
  1. Check user balance (must have ≥5 coins)
  2. Deduct 5 coins from user
  3. Credit 5 coins to scholar (via trigger)
  4. Add 15 minutes to timer
  5. Reactivate chat

## Console Logging
Enhanced logging for debugging:
```
⏰ Timer initialized: 600s elapsed, 1200s remaining
⏰ Starting consultation timer - setting started_at
```

## How to Deploy

### 1. Run SQL Migration (REQUIRED)
```bash
# In Supabase SQL Editor:
# Run: ADD_STARTED_AT_TO_CONSULTATION_BOOKINGS.sql
```

### 2. Test Timer Flow
1. **Book a consultation** as a regular user
2. **Scholar accepts** the booking
3. **Scholar clicks "Start Consultation Chat"**
   - Timer should show full duration (e.g., "30:00")
   - `started_at` is set in database
4. **Close and reopen chat after 5 minutes**
   - Timer should show remaining time (e.g., "25:00")
5. **Wait for timer to expire**
   - Red warning appears
   - Chat input disabled
   - "Extend" button appears (for users)
6. **Click "Extend"** (if user has ≥5 coins)
   - Timer adds 15 minutes
   - Chat reactivates

### 3. Rebuild APK (Optional)
```powershell
npm run build
npx cap sync
cd android
.\gradlew assembleDebug
```

## Technical Details

### Timer Accuracy
- **Server-side calculation**: Uses database timestamps (no client drift)
- **Elapsed time**: `NOW() - started_at` in seconds
- **Remaining time**: `(consultation_duration * 60) - elapsed_seconds`
- **Updates**: Every 1 second via setInterval

### Edge Cases Handled
✅ First time opening chat → Sets started_at  
✅ Reopening chat → Calculates correct remaining time  
✅ Timer expired → Disables chat, shows extend option  
✅ Extension → Adds 15 minutes, reactivates timer  
✅ Multiple extensions → Can extend multiple times  

### Database Fields
```typescript
consultation_bookings:
  - consultation_duration: number (in minutes, set by scholar)
  - started_at: timestamp (set when chat first opened)
  - status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
```

## Visual Example

```
┌──────────────────────────────────────────────┐
│  Consultation Chat                    [Close] │
│  Consulting with Sheikh Muhammad             │
│                                              │
│  🕐  25:30  remaining      [Extend (5 coins)] │
│  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀                    │
├──────────────────────────────────────────────┤
│  [Chat messages here...]                     │
└──────────────────────────────────────────────┘
```

When time < 5 minutes:
```
┌──────────────────────────────────────────────┐
│  🔴  04:23  remaining                         │  ← Red warning
│  ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀                    │
└──────────────────────────────────────────────┘
```

When expired:
```
┌──────────────────────────────────────────────┐
│  🔴  00:00  remaining      [Extend (5 coins)] │
│  ⚠️  Consultation time has expired.           │
│      You can extend for 15 more minutes       │
│      using 5 Masjid Coins.                    │
├──────────────────────────────────────────────┤
│  Chat is disabled - consultation expired     │
└──────────────────────────────────────────────┘
```

## Testing Checklist
- [ ] Run `ADD_STARTED_AT_TO_CONSULTATION_BOOKINGS.sql` in Supabase
- [ ] Book a consultation
- [ ] Start chat and verify timer shows full duration
- [ ] Close and reopen chat - verify timer continues from correct time
- [ ] Wait for expiration or manually set `started_at` to past time
- [ ] Verify chat disables and extend button appears
- [ ] Test extension with sufficient balance
- [ ] Verify scholar receives extension payment

## Files Modified
1. ✅ `src/components/ConsultationChat.tsx` - Timer logic and initialization
2. ✅ `ADD_STARTED_AT_TO_CONSULTATION_BOOKINGS.sql` - Database migration (NEW)

## Next Steps
1. **Deploy**: Run the SQL migration in Supabase SQL Editor
2. **Test**: Follow the testing checklist above
3. **Monitor**: Check console logs for timer initialization
4. **Rebuild**: Create new APK with timer functionality
