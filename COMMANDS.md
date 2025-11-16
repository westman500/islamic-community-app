# 🎮 Quick Command Reference

Quick access to all commands you'll need for this project.

---

## 📦 Initial Setup Commands

```powershell
# Install all dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🔐 Supabase CLI Commands

```powershell
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref wiuctdkanxmayprckvbe

# Set Edge Function secrets
supabase secrets set AGORA_APP_ID=1a3cb8e2d1174dd097edcc38466983a0
supabase secrets set AGORA_APP_CERTIFICATE=8427706a725b463f84d2b4e7d9c2ca09

# List all secrets
supabase secrets list

# Deploy token generation function
supabase functions deploy generate-agora-token

# List all functions
supabase functions list

# View function logs (real-time)
supabase functions logs generate-agora-token --follow

# View recent function logs
supabase functions logs generate-agora-token

# Delete a function (if needed)
supabase functions delete generate-agora-token
```

---

## 🧪 Testing Commands

```powershell
# Test Edge Function with curl (Windows PowerShell)
# Replace YOUR_ACCESS_TOKEN with actual token from Supabase auth
$token = "YOUR_ACCESS_TOKEN"
$body = @{
    channelName = "test-stream"
    role = "host"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "https://wiuctdkanxmayprckvbe.supabase.co/functions/v1/generate-agora-token" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

---

## 🗄️ Database Commands

```powershell
# Open Supabase dashboard
Start-Process "https://supabase.com/dashboard/project/wiuctdkanxmayprckvbe"

# Run SQL migration (create a .sql file first)
supabase db push

# Reset local database (development only)
supabase db reset

# Generate TypeScript types from database
supabase gen types typescript --project-id wiuctdkanxmayprckvbe > src/types/database.ts
```

---

## 📊 Monitoring Commands

```powershell
# View real-time function logs
supabase functions logs generate-agora-token --follow

# Check function status
supabase functions list

# View project status
supabase status

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix
```

---

## 🚀 Deployment Commands

### Deploy to Vercel
```powershell
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_AGORA_APP_ID
```

### Deploy to Netlify
```powershell
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod

# Set environment variables
netlify env:set VITE_SUPABASE_URL "https://wiuctdkanxmayprckvbe.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
netlify env:set VITE_AGORA_APP_ID "1a3cb8e2d1174dd097edcc38466983a0"
```

---

## 🔧 Development Commands

```powershell
# Format code with Prettier (if installed)
npm run format

# Lint code with ESLint
npm run lint

# Type check without building
npx tsc --noEmit

# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install

# Update all dependencies
npm update

# Check outdated packages
npm outdated
```

---

## 🐛 Debugging Commands

```powershell
# View browser console in terminal
# (Run dev server with verbose logging)
npm run dev -- --debug

# Check TypeScript errors
npx tsc --noEmit

# View all environment variables
Get-ChildItem Env:VITE_*

# Test Supabase connection
# (Create a test script: test-supabase.ts)
npx tsx test-supabase.ts

# Clear Vite cache
Remove-Item -Recurse -Force node_modules/.vite
npm run dev
```

---

## 📱 Mobile Testing Commands

```powershell
# Get local network IP for mobile testing
ipconfig | Select-String "IPv4"

# Start dev server on network (accessible from mobile)
npm run dev -- --host

# Access from mobile browser:
# http://YOUR_LOCAL_IP:5173
```

---

## 🗑️ Cleanup Commands

```powershell
# Remove node_modules
Remove-Item -Recurse -Force node_modules

# Remove build output
Remove-Item -Recurse -Force dist

# Remove Vite cache
Remove-Item -Recurse -Force node_modules/.vite

# Full cleanup and reinstall
Remove-Item -Recurse -Force node_modules, dist, node_modules/.vite
npm install
```

---

## 🔑 Key URLs

- **Supabase Dashboard**: https://supabase.com/dashboard/project/wiuctdkanxmayprckvbe
- **Agora Console**: https://console.agora.io/
- **Local Dev Server**: http://localhost:5173
- **Supabase SQL Editor**: https://supabase.com/dashboard/project/wiuctdkanxmayprckvbe/editor
- **Supabase Functions**: https://supabase.com/dashboard/project/wiuctdkanxmayprckvbe/functions

---

## 🆘 Emergency Commands

```powershell
# Kill all Node processes (if dev server hangs)
Stop-Process -Name node -Force

# Kill process on port 5173 (if port is in use)
Get-NetTCPConnection -LocalPort 5173 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }

# Reset Supabase local state
supabase stop
supabase start

# Force redeploy Edge Function
supabase functions delete generate-agora-token
supabase functions deploy generate-agora-token
```

---

## 📝 Useful One-Liners

```powershell
# Count lines of code
(Get-ChildItem -Recurse -Include *.tsx,*.ts,*.css -Exclude node_modules,dist | Get-Content).Count

# Find TODO comments
Get-ChildItem -Recurse -Include *.tsx,*.ts | Select-String "TODO"

# Check bundle size
npm run build; (Get-Item dist/assets/*.js).Length / 1MB

# List all components
Get-ChildItem src/components -Recurse -Include *.tsx | Select-Object Name
```

---

## 🎯 Quick Start (First Time)

```powershell
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open browser to http://localhost:5173

# 4. Setup Supabase (in separate terminal)
npm install -g supabase
supabase login
supabase link --project-ref wiuctdkanxmayprckvbe
supabase secrets set AGORA_APP_ID=1a3cb8e2d1174dd097edcc38466983a0
supabase secrets set AGORA_APP_CERTIFICATE=8427706a725b463f84d2b4e7d9c2ca09
supabase functions deploy generate-agora-token

# 5. Test the app! 🚀
```

---

## 💡 Pro Tips

1. **Keep logs open while developing**:
   ```powershell
   # Terminal 1
   npm run dev
   
   # Terminal 2
   supabase functions logs generate-agora-token --follow
   ```

2. **Quick test after code changes**:
   ```powershell
   npm run build && npm run preview
   ```

3. **Monitor Agora usage**:
   - Open Agora Console
   - Go to Usage → View usage statistics
   - Check for unexpected spikes

4. **Backup database regularly**:
   - Supabase Dashboard → Database → Backups
   - Download SQL dumps weekly

---

**Bookmark this file for quick command access!** 🔖
