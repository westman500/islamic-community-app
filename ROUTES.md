# 🗺️ Application Routes

Complete list of all routes in the Islamic Community Platform.

---

## 🌐 Public Routes (No Authentication Required)

### `/signin`
- **Component**: `UserSignIn.tsx`
- **Purpose**: User authentication
- **Features**:
  - Email/password login
  - Link to sign-up page
  - Remember me checkbox
  - Error handling
- **Access**: Anyone
- **Redirects to**: Dashboard after successful login

### `/signup`
- **Component**: `UserSignUp.tsx`
- **Purpose**: New user registration
- **Features**:
  - Email/password registration
  - Full name input
  - Automatic profile creation with role='user'
  - Link to sign-in page
- **Access**: Anyone
- **Redirects to**: Dashboard after successful registration

---

## 🔓 Protected Routes (All Authenticated Users)

### `/prayer-times`
- **Component**: `PrayerTimes.tsx`
- **Purpose**: Display Islamic prayer times
- **Features**:
  - Automatic geolocation
  - 5 daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha)
  - Current prayer indicator
  - Next prayer countdown
  - Uses `adhan` library for calculations
- **Access**: All authenticated users
- **Permissions**: None required

### `/quran`
- **Component**: `QuranReader.tsx`
- **Purpose**: Read and listen to the Quran
- **Features**:
  - All 114 surahs
  - Arabic text
  - English translation
  - Audio recitation (AlQuran Cloud API)
  - Play/pause controls
  - Verse navigation
- **Access**: All authenticated users
- **Permissions**: None required

### `/qibla`
- **Component**: `QiblaDirection.tsx`
- **Purpose**: Show direction to Mecca
- **Features**:
  - Real-time compass using device orientation
  - Geolocation-based calculation
  - Visual compass with Kaaba indicator
  - Angle display
  - Mobile-optimized
- **Access**: All authenticated users
- **Permissions**: None required
- **Requirements**: Device with orientation sensors

---

## 👥 Member-Only Routes (role='user')

### `/watch-stream`
- **Component**: `UserPrayerServiceViewer.tsx`
- **Purpose**: Watch live prayer services and lectures
- **Features**:
  - List of active streams
  - Join stream with channel name
  - Real-time video/audio playback
  - Remote video display
  - Leave stream button
  - Agora RTC integration (subscriber role)
- **Access**: Members only (role='user')
- **Blocked**: Scholars, Imams (they use `/start-stream`)
- **Permissions**: `canStream: false`
- **Token Role**: `'audience'` (subscriber)

### `/donate`
- **Component**: `ZakatDonation.tsx`
- **Purpose**: Donate to scholars and community
- **Features**:
  - Select scholar from dropdown
  - Enter donation amount
  - Optional message
  - Submit donation record
  - View donation history
- **Access**: Members only (role='user')
- **Blocked**: Scholars, Imams (cannot donate)
- **Permissions**: `canDonate: true`
- **Database**: Inserts into `donations` table

### `/book-consultation`
- **Component**: `ConsultationBooking.tsx`
- **Purpose**: Book one-on-one consultations with scholars
- **Features**:
  - Select scholar
  - Choose date and time
  - Enter consultation topic
  - Add description
  - Submit booking request
  - View pending/confirmed bookings
- **Access**: Members only (role='user')
- **Blocked**: Scholars, Imams (they use `/manage-consultations`)
- **Permissions**: `canBookConsultation: true`
- **Database**: Inserts into `consultations` table with status='pending'

---

## 🎓 Scholar/Imam-Only Routes (role='scholar' or 'imam')

### `/start-stream`
- **Component**: `ScholarLiveStream.tsx`
- **Purpose**: Start and manage live streams
- **Features**:
  - Enter stream title
  - Start live stream
  - Real-time video preview
  - Toggle video on/off
  - Toggle audio on/off
  - Stop stream button
  - Agora RTC integration (publisher role)
  - Automatic channel creation
- **Access**: Scholars and Imams only
- **Blocked**: Regular members (they use `/watch-stream`)
- **Permissions**: `canStream: true`
- **Token Role**: `'host'` (publisher)
- **Database**: Inserts into `streams` table with is_active=true

### `/manage-consultations`
- **Component**: `ScholarConsultationManager.tsx`
- **Purpose**: View and manage consultation bookings
- **Features**:
  - List all consultation requests
  - Filter by status (pending, confirmed, completed, cancelled)
  - View user details
  - View date/time
  - Update booking status
  - Mark as confirmed/completed/cancelled
  - View consultation history
- **Access**: Scholars and Imams only
- **Blocked**: Regular members (they use `/book-consultation`)
- **Permissions**: `canManageConsultations: true`
- **Database**: Queries `consultations` where scholar_id=current_user

---

## 🚫 Redirects and Error Routes

### `/` (Root)
- **Redirect**: Authenticated users → `/prayer-times`
- **Redirect**: Unauthenticated users → `/signin`

### `/dashboard`
- **Redirect**: Based on user role
  - Regular users → `/watch-stream`
  - Scholars/Imams → `/start-stream`

### `*` (404 Not Found)
- **Component**: Custom 404 page (can be added)
- **Features**: Link back to home/dashboard

### Unauthorized Access
- **Behavior**: Redirect to `/dashboard`
- **Toast**: "You don't have permission to access this page"
- **Examples**:
  - Scholar trying to access `/donate`
  - Member trying to access `/start-stream`

---

## 🛣️ Route Structure Summary

```
Public
├── /signin                    ← Login
└── /signup                    ← Register

Protected (All Users)
├── /prayer-times              ← Prayer times
├── /quran                     ← Quran reader
└── /qibla                     ← Qibla compass

Protected (Members Only)
├── /watch-stream              ← Watch streams
├── /donate                    ← Donate to scholars
└── /book-consultation         ← Book consultations

Protected (Scholars/Imams Only)
├── /start-stream              ← Start live stream
└── /manage-consultations      ← Manage bookings

Special
├── /                          ← Redirects based on auth
└── *                          ← 404 page
```

---

## 🔐 Route Protection Logic

### How ProtectedRoute Works

```typescript
<ProtectedRoute allowedRoles={['scholar', 'imam']}>
  <ScholarLiveStream />
</ProtectedRoute>
```

**Check 1**: Is user authenticated?
- ❌ No → Redirect to `/signin`
- ✅ Yes → Continue

**Check 2**: Does user have allowed role?
- ❌ No → Redirect to `/dashboard` with error toast
- ✅ Yes → Render component

### Permission Hooks

```typescript
const { canStream, canDonate, canBookConsultation, canManageConsultations } = usePermissions()

// Usage in components
if (canStream) {
  // Show "Start Stream" button
}

if (canDonate) {
  // Show "Donate" button
}
```

---

## 📱 Mobile Routes

All routes are mobile-responsive:
- ✅ `/prayer-times` - Works on mobile
- ✅ `/quran` - Scrollable on mobile
- ✅ `/qibla` - **Best on mobile** (uses device sensors)
- ✅ `/watch-stream` - Mobile video player
- ✅ `/start-stream` - Mobile camera access
- ✅ `/donate` - Mobile-friendly forms
- ✅ `/book-consultation` - Mobile date/time pickers
- ✅ `/manage-consultations` - Mobile table/cards

---

## 🧪 Testing Routes

### Test Public Routes
```
1. Go to http://localhost:5173/signin
2. Go to http://localhost:5173/signup
3. Verify you can access without login
```

### Test Protected Routes (All Users)
```
1. Sign in as any user
2. Go to /prayer-times → Should work
3. Go to /quran → Should work
4. Go to /qibla → Should work
```

### Test Member Routes
```
1. Sign in as user (role='user')
2. Go to /watch-stream → Should work ✅
3. Go to /donate → Should work ✅
4. Go to /book-consultation → Should work ✅
5. Try /start-stream → Should redirect ❌
6. Try /manage-consultations → Should redirect ❌
```

### Test Scholar Routes
```
1. Sign in as scholar (role='scholar')
2. Go to /start-stream → Should work ✅
3. Go to /manage-consultations → Should work ✅
4. Try /donate → Should redirect ❌
5. Try /book-consultation → Should redirect ❌
6. Go to /watch-stream → Should redirect ❌
```

---

## 🔄 Route Navigation Flow

### For Regular Members
```
Sign In → Prayer Times → Watch Stream → Donate → Book Consultation
   ↑                                                        │
   └────────────────── Sign Out ←─────────────────────────┘
```

### For Scholars
```
Sign In → Prayer Times → Start Stream → Manage Consultations
   ↑                                                        │
   └────────────────── Sign Out ←─────────────────────────┘
```

---

## 📋 Route Checklist

Before deployment, verify:

- [ ] All routes render without errors
- [ ] Authentication redirects work
- [ ] Role-based access control enforced
- [ ] 404 page shows for invalid routes
- [ ] Mobile responsive on all routes
- [ ] Breadcrumbs/navigation clear
- [ ] Back button behavior correct
- [ ] Deep links work (refresh on any page)

---

## 🎨 Navigation Menu Example

You can add a navigation menu to `App.tsx`:

```typescript
// Suggested navigation component
const Navigation = () => {
  const { profile } = useAuth()
  const { canStream, canDonate, canBookConsultation, canManageConsultations } = usePermissions()
  
  return (
    <nav>
      <Link to="/prayer-times">Prayer Times</Link>
      <Link to="/quran">Quran</Link>
      <Link to="/qibla">Qibla</Link>
      
      {canStream && <Link to="/start-stream">Start Stream</Link>}
      {!canStream && <Link to="/watch-stream">Watch Stream</Link>}
      
      {canDonate && <Link to="/donate">Donate</Link>}
      {canBookConsultation && <Link to="/book-consultation">Book Consultation</Link>}
      {canManageConsultations && <Link to="/manage-consultations">Manage Consultations</Link>}
      
      <button onClick={signOut}>Sign Out</button>
    </nav>
  )
}
```

---

## 🚀 Adding New Routes

To add a new route:

1. **Create component** in `src/components/`
2. **Add route** in `App.tsx`:
   ```typescript
   <Route 
     path="/new-feature" 
     element={
       <ProtectedRoute allowedRoles={['user', 'scholar', 'imam']}>
         <NewFeatureComponent />
       </ProtectedRoute>
     } 
   />
   ```
3. **Add navigation link** in menu
4. **Test access** for all roles
5. **Update this file** with route documentation

---

**All Routes Documented!** Use this as a reference for navigation and access control. 🗺️
