# 🔍 VERIFY YOUR AGORA CREDENTIALS

## Current Problem
Your App ID `6bc4256e9b5349f38d791a3c86b535a7` is being rejected by Agora servers with:
```
"invalid vendor key, can not find appid"
```

This means **this App ID does not exist** in Agora's system.

## ✅ STEP-BY-STEP VERIFICATION

### 1. Open Agora Console
Go to: https://console.agora.io/projects

### 2. Sign In
Make sure you're signed into the **correct Agora account** (the one you created the project in).

### 3. Check Your Projects
Look at the list of projects. You should see your project(s) listed.

**Questions to answer:**
- ❓ Do you see ANY projects in the list?
- ❓ If yes, what is the name of your livestream project?
- ❓ What App ID is shown for that project?

### 4. Verify App ID
Click on your project to see the details:
- App ID should be a **32-character hexadecimal string**
- It should look like: `1a3cb8e2d1174dd097edcc38466983a0`

**Compare carefully:**
- Current configured App ID: `6bc4256e9b5349f38d791a3c86b535a7`
- App ID from console: `________________________` ← **FILL THIS IN**

### 5. Check Authentication Mode
In your project settings, look for "Primary Certificate":
- ✅ **Enabled** = Secured mode (App ID + Token) - RECOMMENDED
- ❌ **Disabled** = Testing mode (App ID only) - NOT SECURE

Current status: ✅ Enabled (certificate: `6d62c804c0374603995e7167d8379622`)

## 🆕 IF NO PROJECT EXISTS

If you don't see any projects, **create a new one**:

1. Click **"Create"** or **"Create Project"**
2. Enter project name: `Masjid Livestream`
3. Select **"Secured mode: APP ID + Token"**
4. Click **"Submit"**
5. **Copy the App ID** (32 characters)
6. Click **"Primary Certificate"** → **"Enable"**
7. **Copy the Certificate** (32 characters)

## 📝 WHAT TO TELL ME

After checking your Agora Console, tell me:

1. **App ID from console:** `________________________________`
2. **Primary Certificate from console:** `________________________________`
3. **Project name:** `________________________________`

Then I will update ALL configuration files with the correct credentials and get your livestream working!

## ⚠️ IMPORTANT

The App ID **MUST** match exactly what's in your Agora Console. Even one character different will cause this error.
