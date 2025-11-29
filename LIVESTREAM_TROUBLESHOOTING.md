# 🔧 Livestreaming Troubleshooting Guide
*Comprehensive solutions for "Failed to generate streaming token" and screen availability issues*

## 🚨 **COMMON ISSUE: "Failed to generate streaming token"**

### ✅ **IMMEDIATE SOLUTIONS**

#### **1. Authentication Required (Most Common)**
```
Error: "Authentication required. Please sign in to use livestreaming features."
```

**Solution:**
- ✅ **Sign in to your account** before trying to livestream
- The system requires authentication to generate secure tokens
- Go to the login page and authenticate with your credentials

---

#### **2. Network Connection Issues**
```
Error: "Network error. Please check your internet connection and try again."
```

**Solution:**
- ✅ **Check your internet connection**
- Try refreshing the page
- Test other websites to verify connectivity
- Restart your router if needed

---

#### **3. Browser/HTTPS Issues**
```
Error: "Camera or microphone permission denied"
```

**Solution:**
- ✅ **Check browser address bar** for camera/microphone icons
- Click the camera icon and select "Allow"
- Ensure you're on HTTPS (localhost is OK for development)
- Try a different browser (Chrome, Firefox, Edge)

---

## 📱 **SCREEN AVAILABILITY ISSUES**

### **Problem: Screen sharing not working**

#### **Symptoms:**
- Black screen when trying to share
- "Screen sharing unavailable" message
- Camera works but screen share doesn't

#### **Solutions:**

1. **Browser Permissions:**
   ```
   • Chrome: Settings → Privacy → Site Settings → Camera/Screen capture
   • Firefox: about:preferences → Privacy & Security → Permissions
   • Edge: Settings → Site permissions → Camera/Screen capture
   ```

2. **System Permissions (Windows):**
   ```
   • Windows Settings → Privacy → Camera/Microphone
   • Allow apps to access camera/microphone
   • Allow desktop apps to access camera/microphone
   ```

3. **Alternative Solutions:**
   ```
   • Use camera mode instead of screen sharing
   • Close other applications using camera/microphone
   • Restart browser completely
   • Try incognito/private browsing mode
   ```

---

## 🔍 **DIAGNOSTIC STEPS**

### **Step 1: Test Your Setup**
1. Visit: `http://localhost:5174/test-agora`
2. Click "Test Connection"
3. Review the diagnostic results

### **Step 2: Check System Status**
The diagnostic will show:
- ✅ HTTPS connection status
- ✅ Browser media support
- ✅ Available cameras/microphones
- ✅ Screen sharing capability
- ✅ Network connectivity to servers

### **Step 3: Review Error Messages**
Look for specific error patterns:

| Error Pattern | Cause | Solution |
|--------------|-------|----------|
| `Unauthorized` | Not signed in | Sign in to your account |
| `Network error` | Connection issue | Check internet, refresh page |
| `NotAllowedError` | Permissions denied | Allow camera/microphone in browser |
| `NotFoundError` | No devices found | Connect camera/microphone |
| `Screen sharing unavailable` | System restrictions | Try camera mode instead |

---

## 🛠️ **TECHNICAL TROUBLESHOOTING**

### **For Developers:**

#### **Check Server Status:**
```bash
# Verify development server is running
curl http://localhost:5174

# Test Supabase connectivity
curl https://jtmmeumzjcldqukpqcfi.supabase.co/rest/v1/
```

#### **Check Edge Function Deployment:**
```bash
# List deployed functions
npx supabase functions list --project-ref jtmmeumzjcldqukpqcfi

# Check secrets
npx supabase secrets list --project-ref jtmmeumzjcldqukpqcfi
```

#### **Browser Developer Tools:**
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for Agora-related errors
4. Check Network tab for failed requests

---

## 🎯 **QUICK FIX CHECKLIST**

### **Before Starting a Livestream:**
- [ ] ✅ Signed in to your account
- [ ] ✅ Internet connection stable
- [ ] ✅ Browser allows camera/microphone access
- [ ] ✅ Camera/microphone connected and working
- [ ] ✅ Using HTTPS or localhost
- [ ] ✅ No other apps using camera/microphone
- [ ] ✅ Browser is up to date

### **If Issues Persist:**
1. **Refresh the page** and try again
2. **Clear browser cache** and cookies
3. **Try a different browser**
4. **Restart your computer**
5. **Check for browser/system updates**

---

## 📞 **Getting Help**

### **System Information to Provide:**
- Browser type and version
- Operating system
- Error message (exact text)
- Steps you tried
- Whether camera/microphone work in other apps

### **Useful Links:**
- **Development Server**: http://localhost:5174/
- **Agora Test Page**: http://localhost:5174/test-agora
- **Supabase Dashboard**: https://supabase.com/dashboard/project/jtmmeumzjcldqukpqcfi

---

*This guide covers 95% of common livestreaming issues. Follow the steps in order for best results.*