# 🔐 GitHub Secrets - Complete List

## Add these 7 secrets to GitHub

**Go to:** Your GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

---

## Secret 1: BUILD_CERTIFICATE_BASE64
**Value:** Open `cert_base64.txt` and copy ALL the content
```
Location: C:\Users\SUMMERHILL\masjid\cert_base64.txt
```

---

## Secret 2: P12_PASSWORD
**Value:** 
```
Morayo@
```

---

## Secret 3: BUILD_PROVISION_PROFILE_BASE64
**Value:** Open `profile_base64.txt` and copy ALL the content
```
Location: C:\Users\SUMMERHILL\masjid\profile_base64.txt
```

---

## Secret 4: KEYCHAIN_PASSWORD
**Value:** Any random password you choose (e.g., TempKeychain2025!)
```
TempKeychain2025!
```
(You can use this or create your own)

---

## Secret 5: APP_STORE_CONNECT_API_KEY_ID
**Value:**
```
M833WGL82R
```

---

## Secret 6: APP_STORE_CONNECT_API_ISSUER_ID
**Value:**
```
e711b528-dc8d-4ce8-b88c-56d4f497f8b1
```

---

## Secret 7: APP_STORE_CONNECT_API_KEY_CONTENT
**Value:** Open `apikey_base64.txt` and copy ALL the content
```
Location: C:\Users\SUMMERHILL\masjid\apikey_base64.txt
```

---

## Quick Checklist

- [x] BUILD_CERTIFICATE_BASE64 (from cert_base64.txt)
- [x] P12_PASSWORD (Morayo@)
- [x] BUILD_PROVISION_PROFILE_BASE64 (from profile_base64.txt)
- [x] KEYCHAIN_PASSWORD (TempKeychain2025!)
- [x] APP_STORE_CONNECT_API_KEY_ID (M833WGL82R)
- [x] APP_STORE_CONNECT_API_ISSUER_ID (e711b528-dc8d-4ce8-b88c-56d4f497f8b1)
- [x] APP_STORE_CONNECT_API_KEY_CONTENT (from apikey_base64.txt)
- [x] **FASTLANE_USER** (ajayiakintola375@gmail.com)
- [x] **FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD** (Added)

---

## 🆕 To Enable Automatic TestFlight Upload

Add these additional secrets:

**Secret 8: FASTLANE_USER**
- Go to: GitHub Repository → Settings → Secrets → Actions → New repository secret
- Name: `FASTLANE_USER`
- Value: Your Apple ID email (e.g., `yourname@example.com`)
- ✅ **Added:** ajayiakintola375@gmail.com

**Secret 9: FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD**
- Go to: GitHub Repository → Settings → Secrets → Actions → New repository secret
- Name: `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD`
- Value: App-specific password from Apple

**How to generate App-Specific Password:**
1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. In the Security section, under "App-Specific Passwords", click "Generate Password"
4. Enter a label (e.g., "Fastlane iOS Build")
5. Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)
6. Add it as a GitHub secret

This is the email you use to sign in to App Store Connect.

---

## After Adding Secrets

1. Commit and push your code:
   ```bash
   git add .
   git commit -m "Add iOS build automation"
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Build your iOS app
   - Create IPA file
   - Upload to TestFlight
   - Save IPA as downloadable artifact

3. Build time: ~15-20 minutes

---

## Important Notes

⚠️ **Security:** Delete these files after uploading to GitHub:
- cert_base64.txt
- profile_base64.txt
- apikey_base64.txt
- ios_distribution.key
- ios_distribution.p12
- AuthKey_M833WGL82R.p8

✅ **Keep these files:**
- CertificateSigningRequest.certSigningRequest (for future certificates)
- Masjid.mobileprovision (backup)
