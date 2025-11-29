# Token Generation Issue - Diagnosis

## Error Message
```
Channel: stream_917d2195-af14-4ef3-aaa7-29b8c9ec1f57_1764393154576
Failed to generate streaming token. Please check your internet connection and try again.
```

## Root Cause Analysis

### Edge Function Status
- ✅ Edge function is deployed and accessible
- ✅ CORS headers are configured correctly
- ✅ Agora secrets are set (AGORA_APP_ID, AGORA_APP_CERTIFICATE)

### Likely Issues

1. **Authentication Problem** (Most Likely)
   - The edge function requires a valid Bearer token in the Authorization header
   - The user might not be properly authenticated when attempting to stream
   - Session might have expired

2. **Network/Timeout Issue**
   - Token fetch has 8s timeout on first attempt, 4s on retries
   - Network latency might be causing timeouts

3. **Edge Function Error**
   - Function might be returning an error response
   - Check logs for specific error details

## Troubleshooting Steps

### Step 1: Verify Authentication
Open browser console and check:
```javascript
// Check if user is signed in
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)
```

Expected: Should show a valid session with access_token

### Step 2: Test Token Generation Manually
In the ScholarLiveStream page:
1. Click "Test Token (Debug)" button
2. Check browser console for detailed response
3. Look for specific error messages

### Step 3: Check Edge Function Logs
```powershell
npx supabase functions logs generate-agora-token --follow
```

Look for:
- "❌ Missing or invalid Authorization header"
- "❌ Authentication failed"
- "❌ Agora credentials not configured"
- "❌ Channel name is required"

### Step 4: Verify Secrets
```powershell
npx supabase secrets list
```

Should show:
- AGORA_APP_ID
- AGORA_APP_CERTIFICATE
- SUPABASE_URL
- SUPABASE_ANON_KEY

## Quick Fixes

### Fix 1: Sign Out and Sign In Again
```
1. Click profile menu
2. Sign out
3. Sign in again
4. Try streaming immediately
```

### Fix 2: Refresh Auth Token
The code already handles this with retry logic, but you can force it:
```typescript
// In browser console
const { data, error } = await supabase.auth.refreshSession()
console.log('Refreshed:', data)
```

### Fix 3: Check Network
```powershell
# Test connectivity to Supabase
Test-NetConnection -ComputerName jtmmeumzjcldqukpqcfi.supabase.co -Port 443
```

## Code Investigation Points

### 1. Token Fetch in agora.ts (Line 160)
```typescript
const { supabase } = await import('../utils/supabase/client')
const fetchPromise = supabase.functions.invoke('generate-agora-token', {
  body: {
    channelName: channel,
    uid: uid,
    role: role === 'host' ? 1 : 2,
    expirationTimeInSeconds: 3600
  }
})
```

**Check**: Does supabase client have valid session?

### 2. Edge Function Auth Check (Line 227)
```typescript
const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized: Bearer token required' }), {
    status: 401
  })
}
```

**Check**: Is Authorization header being sent?

### 3. Session Validation
```typescript
const authRes = await supabaseClient.auth.getUser()
const user = authRes.data?.user
if (authRes.error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401
  })
}
```

**Check**: Is the session token valid and not expired?

## Recommended Solution

Add better error handling and logging to identify the exact failure point:

1. **Enhanced Error Messages**: Show specific error from edge function
2. **Session Validation**: Check session before attempting token generation
3. **Retry Logic**: Already implemented (3 attempts with backoff)
4. **User Feedback**: Show clear error messages with actionable steps

## Testing Checklist

- [ ] User is signed in (check session in browser console)
- [ ] Edge function is responding (test with "Test Token (Debug)")
- [ ] Secrets are configured (verified with `npx supabase secrets list`)
- [ ] Network connectivity is good (ping supabase.co)
- [ ] Browser has internet access (try opening other websites)
- [ ] No VPN/firewall blocking Supabase
- [ ] Session hasn't expired (sign out and sign in again)

## Next Steps

1. Sign in to the application
2. Open browser console (F12)
3. Click "Test Token (Debug)" button
4. Share the console output to identify exact error
5. Check edge function logs for server-side errors
