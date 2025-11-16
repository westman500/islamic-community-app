# 🕌 Islamic Community Platform

A comprehensive web application for Islamic communities featuring live streaming, Quran reading, prayer times, and consultation booking.

## ✨ Features

- 🎥 **Live Video Streaming** - Scholars can broadcast prayer services and lectures
- 📖 **Quran Reader** - Arabic text with translation and audio recitation
- 🧭 **Qibla Compass** - Real-time direction to Mecca using device sensors
- 🕌 **Prayer Times** - Accurate prayer times based on geolocation
- 📅 **Consultation Booking** - Schedule one-on-one sessions with scholars
- 💰 **Zakat Donations** - Support scholars and the community
- 🔐 **Role-Based Access Control** - Separate features for scholars and members

## 🚀 Quick Start

```powershell
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

## 📚 Documentation

- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment guide
- **[AGORA_TOKEN_DEPLOYMENT.md](./AGORA_TOKEN_DEPLOYMENT.md)** - Secure streaming setup
- **[SETUP.md](./SETUP.md)** - Database schema and configuration
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Feature overview
- **[COMMANDS.md](./COMMANDS.md)** - Quick command reference

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI
- **Backend**: Supabase (Auth + Database)
- **Video Streaming**: Agora RTC SDK
- **Prayer Times**: adhan library
- **Quran API**: api.alquran.cloud

## 🎯 Role-Based Features

### Scholars & Imams
- ✅ Start/stop live streams
- ✅ Manage consultation bookings
- ✅ View donation history
- ❌ Cannot donate
- ❌ Cannot book consultations

### Members (Users)
- ✅ Watch live streams
- ✅ Donate to scholars
- ✅ Book consultations
- ✅ Read Quran
- ✅ View prayer times
- ✅ Use Qibla compass
- ❌ Cannot stream

## 🔐 Security Features

- **Server-side Token Generation** - Agora tokens generated securely via Supabase Edge Function
- **Role-Based Access Control** - Strict permissions for all features
- **Row-Level Security** - Database access controlled by user roles
- **Secure Authentication** - Supabase Auth with JWT tokens
- **Certificate Protection** - Agora app certificate stored server-side only

## 📋 Next Steps

1. **Install dependencies**: `npm install`
2. **Setup database**: Run SQL from `SETUP.md` in Supabase
3. **Deploy Edge Function**: Follow `AGORA_TOKEN_DEPLOYMENT.md`
4. **Enable Agora Certificate**: Enable in Agora Console
5. **Test features**: Use `DEPLOYMENT_CHECKLIST.md`

## 🆘 Need Help?

- Check `COMMANDS.md` for quick command reference
- Review `DEPLOYMENT_CHECKLIST.md` for troubleshooting
- See `AGORA_TOKEN_DEPLOYMENT.md` for streaming issues

## 📄 License

MIT License - Feel free to use this project for your Islamic community!

---

**Built with ❤️ for the Muslim community**
