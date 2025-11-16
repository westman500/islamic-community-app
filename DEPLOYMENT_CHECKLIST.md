# 📋 Islamic Community Platform - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Install Dependencies
- [ ] Run `npm install` in project root
- [ ] Verify all packages installed successfully
- [ ] Check for any security vulnerabilities: `npm audit`

### 2. Supabase Database Setup
- [ ] Login to [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Navigate to SQL Editor
- [ ] Run the SQL schema from `SETUP.md` to create tables:
  - `profiles` table with role field
  - `streams` table for live streaming
  - `consultations` table for booking
  - `donations` table for Zakat
  - RLS policies for all tables
- [ ] Verify tables created in Table Editor
- [ ] Test RLS policies with test user

### 3. Agora Console Setup
- [ ] Login to [Agora Console](https://console.agora.io/)
- [ ] Navigate to your project (App ID: `1a3cb8e2d1174dd097edcc38466983a0`)
- [ ] Go to **Config** → **Features** → **Primary Certificate**
- [ ] Click **Enable** on Primary Certificate
- [ ] ✅ Confirm certificate status shows "Enabled"

### 4. Supabase Edge Function Deployment
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref wiuctdkanxmayprckvbe`
- [ ] Set secrets:
  ```powershell
  supabase secrets set AGORA_APP_ID=1a3cb8e2d1174dd097edcc38466983a0
  supabase secrets set AGORA_APP_CERTIFICATE=8427706a725b463f84d2b4e7d9c2ca09
  ```
- [ ] Deploy function: `supabase functions deploy generate-agora-token`
- [ ] Verify deployment: `supabase functions list`
- [ ] Test function with curl (see `AGORA_TOKEN_DEPLOYMENT.md`)

### 5. Development Environment
- [ ] Copy `.env.example` to `.env` (already done)
- [ ] Verify `.env` has correct values:
  - ✅ `VITE_SUPABASE_URL`
  - ✅ `VITE_SUPABASE_ANON_KEY`
  - ✅ `VITE_AGORA_APP_ID`
  - ⚠️ Certificate NOT in `.env` (stored server-side)
- [ ] Start dev server: `npm run dev`
- [ ] Verify no console errors

---

## 🧪 Testing Checklist

### Authentication Testing
- [ ] Test user sign-up (creates profile with role='user')
- [ ] Test scholar sign-up (need to manually update role in Supabase)
- [ ] Test sign-in
- [ ] Test sign-out
- [ ] Verify session persists on page refresh

### Scholar/Imam Features (role='scholar' or 'imam')
- [ ] Navigate to `/start-stream`
- [ ] Start a live stream
- [ ] Verify stream appears in database
- [ ] Toggle video on/off
- [ ] Toggle audio on/off
- [ ] Stop stream
- [ ] Go to `/manage-consultations`
- [ ] View consultation bookings
- [ ] Verify cannot access `/donate` (blocked)
- [ ] Verify cannot access `/book-consultation` (blocked)

### Member Features (role='user')
- [ ] Navigate to `/watch-stream`
- [ ] Join an active stream
- [ ] Verify can see video/audio
- [ ] Cannot publish (viewer only)
- [ ] Go to `/donate`
- [ ] Select scholar and donate amount
- [ ] Go to `/book-consultation`
- [ ] Book a consultation with scholar
- [ ] Verify cannot access `/start-stream` (blocked)

### Islamic Features
- [ ] Go to `/prayer-times`
- [ ] Allow geolocation
- [ ] Verify current prayer time shows
- [ ] Check next prayer countdown
- [ ] Go to `/quran`
- [ ] Browse surahs
- [ ] Play audio recitation
- [ ] View Arabic + translation
- [ ] Go to `/qibla`
- [ ] Allow device orientation
- [ ] Verify compass points to Mecca
- [ ] Test on mobile device

---

## 🚀 Production Deployment (Vercel/Netlify)

### Build and Deploy
- [ ] Test production build: `npm run build`
- [ ] Preview build: `npm run preview`
- [ ] Deploy to hosting platform:
  - **Vercel**: `vercel --prod`
  - **Netlify**: Drag `dist/` folder to Netlify
- [ ] Set environment variables on hosting platform:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_AGORA_APP_ID`
- [ ] Verify deployment URL works

### Post-Deployment
- [ ] Test all features on production URL
- [ ] Verify HTTPS is enabled
- [ ] Test on mobile devices
- [ ] Test streaming with real users
- [ ] Monitor Agora usage dashboard
- [ ] Monitor Supabase function logs

---

## 📊 Monitoring & Maintenance

### Daily Checks
- [ ] Check Supabase function logs: `supabase functions logs generate-agora-token`
- [ ] Monitor Agora usage in console
- [ ] Review error reports in browser console

### Weekly Checks
- [ ] Review consultation bookings in database
- [ ] Check donation records
- [ ] Verify stream history
- [ ] Update packages: `npm update`

### Security Audits
- [ ] Review RLS policies monthly
- [ ] Rotate Agora certificate annually
- [ ] Update dependencies for security patches
- [ ] Review user roles and permissions

---

## 🆘 Troubleshooting Quick Links

- **Token Generation Issues**: See `AGORA_TOKEN_DEPLOYMENT.md`
- **Database Schema**: See `SETUP.md`
- **Environment Setup**: See `.env.example`
- **Component Documentation**: See `IMPLEMENTATION_SUMMARY.md`
- **Supabase Docs**: https://supabase.com/docs
- **Agora Docs**: https://docs.agora.io/en/video-calling/get-started/get-started-sdk

---

## ✅ Ready for Production?

Before going live, ensure:
- ✅ All database tables created with RLS policies
- ✅ Edge function deployed and tested
- ✅ Agora certificate enabled
- ✅ All features tested on staging
- ✅ Mobile devices tested
- ✅ Error monitoring setup
- ✅ Backup strategy in place

---

## 🎯 Next Steps After Deployment

1. **Create Admin Account**
   - Sign up a user
   - Manually set role='admin' in Supabase
   - Build admin dashboard (future feature)

2. **Promote First Scholar**
   - Find user in profiles table
   - Update role='scholar' or 'imam'
   - Notify them they can start streaming

3. **Test with Real Users**
   - Invite beta testers
   - Gather feedback
   - Monitor for errors

4. **Add Features** (Optional)
   - Payment integration (Paystack/Stripe)
   - Push notifications for prayer times
   - Stream recording/replay
   - Chat during live streams
   - Admin dashboard

---

**Need Help?** Review the detailed guides:
- `SETUP.md` - Initial setup and configuration
- `AGORA_TOKEN_DEPLOYMENT.md` - Secure streaming deployment
- `IMPLEMENTATION_SUMMARY.md` - Feature overview

**You're ready to deploy!** 🚀
