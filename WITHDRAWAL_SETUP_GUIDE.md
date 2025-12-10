# Withdrawal System Setup - Action Required

## Current Status

✅ **Completed:**
- Bank account form added to Profile Settings
- Automatic bank account verification via Paystack API
- Bank dropdown with all Nigerian banks
- Database columns added for bank details
- Edge Function code written and ready
- Error handling and CORS support in Edge Function
- UI improvements for better user experience

❌ **Remaining:**
- Deploy `process-withdrawal` Edge Function to Supabase
- Configure Paystack secret key in Supabase

## What You Need to Do

### Step 1: Run SQL Script (If Not Already Done)

Open Supabase SQL Editor and run:
```sql
-- From: supabase\VERIFY_AND_ADD_BANK_FIELDS.sql
```

This adds the required database columns.

### Step 2: Deploy Edge Function

**Option A: Supabase Dashboard** (Recommended for Windows)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Edge Functions" → "Create function"
4. Name it: `process-withdrawal`
5. Copy ALL code from `supabase\functions\process-withdrawal\index.ts`
6. Paste into dashboard editor
7. Click "Deploy"

**Option B: PowerShell** (If you have Supabase CLI)
```powershell
cd C:\Users\SUMMERHILL\masjid
supabase functions deploy process-withdrawal
```

### Step 3: Configure Paystack Secret Key

1. Get your Paystack secret key:
   - Go to https://dashboard.paystack.com
   - Settings → API Keys & Webhooks
   - Copy "Secret Key" (use TEST mode initially)

2. Add to Supabase:
   - In Edge Functions settings
   - Click "Secrets" or "Environment Variables"
   - Add: `PAYSTACK_SECRET_KEY` = your secret key

### Step 4: Test the System

1. Refresh browser (Ctrl+F5)
2. Go to Profile Settings
3. Add your bank account details:
   - Select bank from dropdown
   - Enter 10-digit account number
   - Account name should auto-fill
   - Click "Save Bank Account"
4. Go to Scholar Wallet
5. Try withdrawing ₦100 (minimum amount)
6. Check:
   - Supabase Edge Function logs
   - Paystack dashboard for transfer status

## Error Reference

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "CORS policy" | Edge Function not deployed | Deploy via dashboard |
| "404 Not Found" | Function doesn't exist | Deploy the function |
| "PAYSTACK_SECRET_KEY not configured" | Secret not set | Add in Edge Function secrets |
| "Please add your bank account details" | No bank account saved | Add in Profile Settings |
| "Could not find the 'bank_account_name' column" | SQL script not run | Run VERIFY_AND_ADD_BANK_FIELDS.sql |
| "Withdrawal system is being deployed" | Edge Function unavailable | Wait or deploy function |

## Important Notes

- **Use Paystack TEST mode first** to avoid real money transfers
- Minimum withdrawal: ₦100
- Withdrawals take up to 24 hours to process
- Check Paystack dashboard for detailed transfer logs
- Edge Function logs are in Supabase Dashboard → Edge Functions → Logs

## Files Modified

- `src/components/ScholarWallet.tsx` - Added better error messages
- `src/components/ProfileSettings.tsx` - Added bank account form with auto-verification
- `supabase/functions/process-withdrawal/index.ts` - Created Edge Function
- `supabase/VERIFY_AND_ADD_BANK_FIELDS.sql` - Database migration
- `supabase/ADD_BANK_ACCOUNT_FIELDS.sql` - Original migration script

## Next Steps After Setup

1. Test with small amount (₦100)
2. Verify transfer appears in Paystack dashboard
3. Switch to LIVE mode when ready for production
4. Update `PAYSTACK_SECRET_KEY` to live key
5. Git commit and push changes
6. Build APK for mobile testing

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check Paystack dashboard → Transfers
3. Verify all environment variables are set
4. Confirm bank account details are correct
