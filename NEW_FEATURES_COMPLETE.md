# NEW FEATURES IMPLEMENTATION - Real-Time Systems

## Overview
This document details the implementation of four major features:
1. **Scholar Profile Viewing with Ratings/Reviews**
2. **Livestream Participant Tracking**
3. **Real-Time Consultation Messaging with Timer**
4. **Account Deletion System**

---

## 1. SCHOLAR PROFILE VIEWING & REVIEWS

### Database Schema

#### Profiles Table Extensions
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specializations TEXT[];
```

#### Scholar Reviews Table
```sql
CREATE TABLE scholar_reviews (
    id UUID PRIMARY KEY,
    scholar_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(scholar_id, reviewer_id, consultation_id)
);
```

### Auto-Calculation Trigger
```sql
CREATE OR REPLACE FUNCTION update_scholar_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET 
        average_rating = (
            SELECT AVG(rating)::NUMERIC(3,2)
            FROM scholar_reviews
            WHERE scholar_id = COALESCE(NEW.scholar_id, OLD.scholar_id)
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM scholar_reviews
            WHERE scholar_id = COALESCE(NEW.scholar_id, OLD.scholar_id)
        )
    WHERE id = COALESCE(NEW.scholar_id, OLD.scholar_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scholar_rating_update
AFTER INSERT OR UPDATE OR DELETE ON scholar_reviews
FOR EACH ROW
EXECUTE FUNCTION update_scholar_rating();
```

### RLS Policies
- **SELECT**: Anyone can view reviews
- **INSERT**: Only users who completed consultations can review
- **UPDATE/DELETE**: Only the reviewer can modify their own review

### Components

#### ScholarProfileViewer.tsx
**Route**: `/scholar/:scholarId`

**Features**:
- Star rating display (average out of 5.0)
- Rating distribution bar chart (5★ to 1★ percentages)
- Completed consultations count
- Verification badges (phone, email, face, certificate)
- Bio and specializations
- Reviews list with star filter dropdown
- Book consultation button
- Message scholar button

**Key Functions**:
```typescript
fetchScholarProfile() // Loads profile with verification data
fetchReviews(starFilter?) // Gets reviews, optionally filtered
renderStars() // Visual star display
getRatingDistribution() // Calculates percentage for each star level
```

#### ReviewSubmissionForm.tsx
**Route**: `/consultation/:consultationId/review`

**Features**:
- Interactive star rating (hover and click)
- 500-character review text
- Eligibility check (consultation must be completed)
- Prevents duplicate reviews
- Sends notification to scholar

**Validation**:
```typescript
checkEligibility()
- Consultation status must be 'completed'
- Must have actual_ended_at timestamp
- No existing review for this consultation
```

---

## 2. LIVESTREAM PARTICIPANT TRACKING

### Database Schema

#### Stream Participants Table
```sql
CREATE TABLE stream_participants (
    id UUID PRIMARY KEY,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ,
    UNIQUE(stream_id, user_id)
);
```

### Auto-Update Trigger
```sql
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
```

### Integration Points

#### On User Join
```typescript
// In UserPrayerServiceViewer.tsx
await supabase.from('stream_participants').insert({
    stream_id: streamId,
    user_id: userId,
    is_active: true
});
```

#### On User Leave
```typescript
await supabase.from('stream_participants')
    .update({ 
        is_active: false, 
        left_at: new Date().toISOString() 
    })
    .eq('stream_id', streamId)
    .eq('user_id', userId);
```

#### Display Viewer Count
```typescript
// Automatically updated by trigger
const viewerCount = stream.viewer_count;
```

---

## 3. REAL-TIME CONSULTATION MESSAGING

### Component: ConsultationMessaging.tsx
**Route**: `/consultation/:consultationId/messages`

### Features

#### 1. Timer Countdown
- Displays remaining time in MM:SS format
- Counts down from `duration_minutes + time_extended_minutes`
- Changes color when < 5 minutes remaining (red warning)
- Auto-closes session when timer expires

```typescript
const timeRemaining = endTime - Date.now();
// Updates every second via setInterval
```

#### 2. Real-Time Messages
Uses Supabase Realtime subscriptions:
```typescript
supabase
    .channel(`consultation:${consultationId}`)
    .on('postgres_changes', {
        event: 'INSERT',
        table: 'messages',
        filter: `consultation_id=eq.${consultationId}`
    }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
    })
    .subscribe();
```

#### 3. Message Types
- **text**: Regular chat messages
- **system**: Session start/end notifications
- **time_extension_request**: User requesting more time
- **time_extension_approved**: Scholar approved extension
- **time_extension_denied**: Scholar denied extension

#### 4. Time Extension Flow

**Request (by either party)**:
```typescript
const pricePerMinute = price / duration_minutes;
const additionalCost = pricePerMinute * extensionMinutes;

await supabase.from('time_extension_requests').insert({
    consultation_id,
    requested_by: userId,
    additional_minutes: extensionMinutes,
    additional_cost,
    expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 min
});
```

**Approval (by other party)**:
```typescript
await supabase.from('time_extension_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);

await supabase.from('consultations')
    .update({ 
        time_extended_minutes: currentExtension + additionalMinutes 
    })
    .eq('id', consultationId);
```

#### 5. Auto-Session Closure
When timer reaches zero:
```typescript
await supabase.from('consultations')
    .update({ 
        actual_ended_at: new Date().toISOString(),
        status: 'completed'
    })
    .eq('id', consultationId);
```

### Database Tables

#### Messages Table (already exists)
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    consultation_id UUID REFERENCES consultations(id),
    sender_id UUID REFERENCES profiles(id),
    content TEXT,
    message_type TEXT, -- 'text', 'system', 'time_extension_request', etc.
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ
);
```

#### Time Extension Requests Table (already exists)
```sql
CREATE TABLE time_extension_requests (
    id UUID PRIMARY KEY,
    consultation_id UUID REFERENCES consultations(id),
    requested_by UUID REFERENCES profiles(id),
    additional_minutes INTEGER,
    additional_cost NUMERIC,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'expired'
    expires_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);
```

---

## 4. ACCOUNT DELETION SYSTEM

### Database Function
```sql
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS void AS $$
BEGIN
    -- Delete all user data (CASCADE handles foreign keys)
    DELETE FROM profiles WHERE id = user_id_to_delete;
    
    -- Cascade deletes:
    -- - consultations (user_id or scholar_id)
    -- - messages (sender_id)
    -- - scholar_reviews (reviewer_id or scholar_id)
    -- - stream_reactions (user_id)
    -- - stream_participants (user_id)
    -- - donations (donor_id)
    -- - notifications (user_id)
    -- - blocked_users (blocker_id or blocked_id)
    -- - reports (reporter_id or reported_id)
    -- - subscriptions (subscriber_id)
    -- - access_restrictions (user_id or restricted_by)
    -- - time_extension_requests (requested_by)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Edge Function
**File**: `supabase/functions/delete-user-account/index.ts`

**Purpose**: Delete user from auth.users (requires service_role key)

**Flow**:
1. Verify authorization token
2. Verify user is deleting their own account
3. Call `delete_user_account()` function with service_role
4. Delete from `auth.users` using admin API
5. Return success response

**Deployment**:
```bash
supabase functions deploy delete-user-account
```

**Set Secrets**:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Component: AccountDeletion.tsx
**Route**: `/delete-account`

#### Two-Step Process

**Step 1: Warning Screen**
- Lists all data that will be deleted:
  - Profile and account info
  - Consultations and messages
  - Reviews written and received
  - Livestream history
  - Donations and payment history
  - Notifications and preferences
  - Blocks and reports
  - Subscriptions

- Special notice for scholars:
  - Profile and ratings removed
  - Members can't book consultations anymore

**Step 2: Confirmation Screen**
- User must type: "DELETE MY ACCOUNT"
- Case-sensitive validation
- Calls Edge Function to complete deletion
- Signs out user and redirects to signin page

### Integration with ProfileSettings
Add link to account deletion:
```typescript
<Link to="/delete-account">
    <Button variant="destructive">Delete Account</Button>
</Link>
```

---

## ROUTING SETUP

Add to `App.tsx`:

```typescript
// Shared routes (all authenticated users)
<Route path="/livestreams" element={
    <ProtectedRoute><LivestreamDiscovery /></ProtectedRoute>
} />

<Route path="/profile-settings" element={
    <ProtectedRoute><ProfileSettings /></ProtectedRoute>
} />

<Route path="/scholar/:scholarId" element={
    <ProtectedRoute><ScholarProfileViewer /></ProtectedRoute>
} />

<Route path="/consultation/:consultationId/messages" element={
    <ProtectedRoute><ConsultationMessaging /></ProtectedRoute>
} />

<Route path="/consultation/:consultationId/review" element={
    <ProtectedRoute allowedRoles={['user']}>
        <ReviewSubmissionForm />
    </ProtectedRoute>
} />

<Route path="/delete-account" element={
    <ProtectedRoute><AccountDeletion /></ProtectedRoute>
} />
```

---

## DEPLOYMENT CHECKLIST

### 1. Database Migrations
```bash
# Run DATABASE_SCHEMA_EXTENDED.sql
supabase db push
```

### 2. Edge Functions
```bash
# Deploy account deletion function
cd supabase/functions/delete-user-account
supabase functions deploy delete-user-account

# Set service role secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

### 3. Environment Variables
Ensure `.env` has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_AGORA_APP_ID=your_agora_app_id
```

### 4. Component Integration
- [x] ScholarProfileViewer added
- [x] ReviewSubmissionForm added
- [x] ConsultationMessaging added
- [x] AccountDeletion added
- [x] Routes configured in App.tsx
- [ ] Navigation links added to main menu
- [ ] Participant tracking integrated in streaming components

---

## TESTING GUIDE

### 1. Scholar Profile & Reviews
1. Complete a consultation as a member
2. Navigate to `/consultation/{id}/review`
3. Submit a 5-star review with text
4. View scholar profile at `/scholar/{scholarId}`
5. Verify rating updated automatically
6. Try filtering reviews by star rating

### 2. Participant Tracking
1. Scholar starts a livestream
2. Multiple members join
3. Check `stream_participants` table for records
4. Verify `streams.viewer_count` updates automatically
5. Member leaves stream
6. Verify `is_active` set to false, `left_at` recorded

### 3. Real-Time Messaging
1. Book a consultation
2. Scholar starts the session
3. Both parties navigate to `/consultation/{id}/messages`
4. Send messages back and forth (verify real-time)
5. Wait for timer warning (< 5 min)
6. Request time extension
7. Approve/deny extension
8. Verify timer extends on approval
9. Wait for auto-close at timer expiration

### 4. Account Deletion
1. Navigate to `/delete-account`
2. Read warning screen
3. Click "I Understand, Continue"
4. Type "DELETE MY ACCOUNT" exactly
5. Click "Delete Forever"
6. Verify redirect to signin page
7. Check database: all user records deleted
8. Verify auth.users deleted (requires Edge Function)

---

## FUTURE ENHANCEMENTS

1. **Payment Integration**
   - Stripe/Paystack for consultation payments
   - Handle time extension charges
   - Service fee deduction (3% for imams)

2. **Notifications**
   - Push notifications for new messages
   - Email notification for time extension requests
   - SMS notification for session ending soon

3. **Analytics**
   - Scholar dashboard with rating trends
   - Consultation duration analytics
   - Popular time slots

4. **Review Moderation**
   - Flag inappropriate reviews
   - Admin review approval system
   - Review appeal process

5. **Enhanced Streaming**
   - Screen sharing for educational content
   - Recording and replay functionality
   - Co-host feature for panel discussions
