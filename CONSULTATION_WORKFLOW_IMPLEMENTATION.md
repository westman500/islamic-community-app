# Consultation Workflow Implementation

## Overview
Complete implementation of consultation booking and session management workflow with scholar acceptance, timer, and refund functionality.

## Database Changes

### New Columns Added to `consultation_bookings`
Run the SQL file: `supabase/ADD_SESSION_TRACKING.sql`

```sql
- consultation_duration (INTEGER): Session duration in minutes
- session_started_at (TIMESTAMP): When scholar started the session
- session_ends_at (TIMESTAMP): When session is scheduled to end
- scholar_accepted (BOOLEAN): Whether scholar has accepted the consultation
- scholar_accepted_at (TIMESTAMP): When scholar accepted
```

## Workflow

### 1. Member Books Consultation
1. Member selects an **online scholar** (only online scholars are shown)
2. Member enters consultation topic
3. System checks for **existing active bookings** with the same scholar
   - Prevents rebooking until previous consultation is completed/cancelled
4. System deducts coins from member's balance
5. Booking created with `status: 'pending'` and `scholar_accepted: false`
6. Member automatically **navigated to chatbox**
7. Shows: "Waiting for [Scholar] to accept your consultation request..."

### 2. Scholar Accepts Consultation
1. Scholar receives notification
2. Scholar navigates to consultation messages
3. Scholar sees "✓ Accept Consultation Request" button
4. On accept:
   - Updates `scholar_accepted: true`
   - Status remains `'pending'`
   - System message sent: "[Scholar] has accepted your consultation request"
5. Scholar sees "🚀 Start Session" button
6. Member sees: "Waiting for them to start the session..."

### 3. Scholar Starts Session
1. Scholar clicks "Start Session"
2. System:
   - Sets `session_started_at` to current time
   - Calculates `session_ends_at` based on `consultation_duration`
   - Updates `status: 'confirmed'`
   - Sets scholar `is_online: false`
   - Sends system message: "✅ [Scholar] has started the session. Session duration: X minutes."
3. **Timer starts counting down** - displayed at top of chatbox
4. Both parties can now chat freely

### 4. Session Active
- **Timer displayed in real-time** at top: `MM:SS` format
- Both parties see timer countdown
- Status shows: "Active Session"
- **No cancellation allowed** once session starts
- Messages flow in real-time

### 5. Session Ends
When timer reaches 0:
1. System automatically:
   - Sets `status: 'completed'`
   - Sets scholar `is_online: true` (back online)
   - Sends message: "⏰ Session time has ended. Consultation completed."
2. Chat input disabled
3. Both parties see "This consultation has ended"

### 6. Cancellation & Refund (Before Session Starts)
Members can cancel **only if session hasn't started**:

1. Member clicks "Cancel & Refund"
2. System:
   - Updates booking `status: 'cancelled'`, `payment_status: 'refunded'`
   - Refunds coins to member's balance
   - Deducts coins from scholar's balance
   - Creates refund transaction records
3. Member receives notification: "Consultation cancelled. X coins refunded to your account."

**Cancellation Rules:**
- ✅ Can cancel: `status: 'pending'` or `status: 'confirmed'` AND `!session_started_at`
- ❌ Cannot cancel: Once `session_started_at` is set

## UI Updates

### ConsultationBooking Component
- **Scholar List**: Only shows online scholars
- **Booking Validation**: Checks for existing active bookings
- **Auto-Navigation**: Redirects to chatbox after payment
- **My Bookings**: 
  - Shows "Join Chat" button for active consultations
  - Shows "Cancel & Refund" only if session hasn't started
  - Status badge: "Session Active" when timer running

### ConsultationMessaging Component
- **Header Timer**: Real-time countdown display
- **Scholar Buttons**:
  - "Accept Consultation Request" (when pending, not accepted)
  - "Start Session" (when accepted, not started)
- **Member Messages**:
  - "Waiting for scholar to accept..." (not accepted)
  - "Waiting for them to start the session..." (accepted, not started)
- **Status Badge**: Changes based on session state
- **Disabled Chat**: When consultation completed

## Technical Details

### Preventing Rebooking
```typescript
const { data: existingBookings } = await supabase
  .from('consultation_bookings')
  .select('id, status')
  .eq('user_id', profile.id)
  .eq('scholar_id', selectedScholar.id)
  .in('status', ['pending', 'confirmed'])

if (existingBookings && existingBookings.length > 0) {
  throw new Error('You already have an active booking with this scholar')
}
```

### Timer Implementation
```typescript
useEffect(() => {
  if (!consultation.session_started_at) return

  const updateTimer = () => {
    const now = new Date().getTime()
    const endTime = new Date(consultation.session_ends_at).getTime()
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
    setTimeRemaining(remaining)
    if (remaining === 0) handleSessionTimeout()
  }

  updateTimer()
  const interval = setInterval(updateTimer, 1000)
  return () => clearInterval(interval)
}, [consultation])
```

### Refund Logic
```typescript
// Update booking status
await supabase.from('consultation_bookings')
  .update({ status: 'cancelled', payment_status: 'refunded' })
  .eq('id', bookingId)

// Refund coins to member
await supabase.from('profiles')
  .update({ masjid_coin_balance: userBalance + coinsToRefund })
  .eq('id', userId)

// Deduct from scholar
await supabase.from('profiles')
  .update({ masjid_coin_balance: scholarBalance - coinsToRefund })
  .eq('id', scholarId)

// Create transaction records
await supabase.from('masjid_coin_transactions').insert([...])
```

## Testing Checklist

- [ ] Member cannot book same scholar twice simultaneously
- [ ] Member navigated to chatbox after payment
- [ ] Member sees waiting message until scholar accepts
- [ ] Scholar can accept consultation
- [ ] Scholar can start session after accepting
- [ ] Timer displays correctly and counts down
- [ ] Timer triggers session end at 0
- [ ] Scholar set offline during session
- [ ] Scholar set online after session ends
- [ ] Member can cancel before session starts
- [ ] Coins refunded on cancellation
- [ ] Cannot cancel after session starts
- [ ] Real-time messages work during session
- [ ] Both parties see system messages

## Files Modified

1. `src/components/ConsultationBooking.tsx`
   - Added navigation hook
   - Added existing booking check
   - Implemented full refund logic
   - Updated booking status to 'pending' initially
   - Auto-navigate to chatbox after booking
   - Updated UI with session status

2. `src/components/ConsultationMessaging.tsx`
   - Added timer implementation
   - Added scholar acceptance handler
   - Updated session start with time tracking
   - Added timer display in header
   - Added scholar action buttons
   - Added member waiting messages
   - Improved session end handling

3. `supabase/ADD_SESSION_TRACKING.sql` (NEW)
   - Migration to add session tracking columns
   - Run this in Supabase SQL Editor

## Next Steps

1. Run the SQL migration: `ADD_SESSION_TRACKING.sql`
2. Test the complete workflow
3. Consider adding:
   - Email/push notifications for each stage
   - Session recording/logs
   - Rating system after completion
   - Time extension requests (optional)
