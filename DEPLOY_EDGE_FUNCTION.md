# Deploy Edge Function to Supabase

The `process-withdrawal` Edge Function needs to be deployed to Supabase for withdrawals to work.

## Method 1: Supabase Dashboard (Recommended for Windows)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `jtmmeumzjcldqukpqcfi`

2. **Navigate to Edge Functions**
   - Click "Edge Functions" in the left sidebar
   - Click "Create a new function" or "Deploy function"

3. **Create the Function**
   - Function name: `process-withdrawal`
   - Click "Create function"

4. **Copy the Code**
   - Open `supabase\functions\process-withdrawal\index.ts` in VS Code
   - Copy ALL the code (Ctrl+A, Ctrl+C)
   - Paste it into the Supabase dashboard code editor
   - Click "Deploy" or "Save"

5. **Set Environment Variables (CRITICAL)**
   - In the Edge Function settings, click "Secrets" or "Environment Variables"
   - Add the following secret:
     - Key: `PAYSTACK_SECRET_KEY`
     - Value: Your Paystack secret key (starts with `sk_live_` or `sk_test_`)
   - These are automatically available:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`

6. **Test the Function**
   - Click "Invoke" or "Test" in the dashboard
   - Use this test payload:
     ```json
     {
       "amount": 1000,
       "reference": "TEST_123",
       "scholar_id": "your-scholar-id",
       "account_number": "0123456789",
       "bank_code": "058",
       "account_name": "Test Account"
     }
     ```
   - You should see a response (even if it fails due to test data)

## Method 2: Using Supabase CLI (If Available)

```powershell
# Navigate to project root
cd C:\Users\SUMMERHILL\masjid

# Deploy the function
supabase functions deploy process-withdrawal

# Set the secret
supabase secrets set PAYSTACK_SECRET_KEY=your_secret_key_here
```

## Verify Deployment

After deployment, test from PowerShell:

```powershell
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0bW1ldW16amNsZHF1a3BxY2ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MzM3NzUsImV4cCI6MjA0NjMwOTc3NX0.cexCFxvjRLlIUWqD8g6LyRf4DZGbvpcaM0l6DRvgd5o"
    "Content-Type" = "application/json"
}

$body = @{
    amount = 1000
    reference = "TEST_123"
    scholar_id = "test-id"
    account_number = "0123456789"
    bank_code = "058"
    account_name = "Test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://jtmmeumzjcldqukpqcfi.supabase.co/functions/v1/process-withdrawal" -Method POST -Headers $headers -Body $body
```

**Expected**: Should return JSON (not 404 or CORS error)

## Get Your Paystack Secret Key

1. Go to: https://dashboard.paystack.com
2. Click "Settings" → "API Keys & Webhooks"
3. Copy your **Secret Key** (starts with `sk_test_` for test mode or `sk_live_` for production)
4. **Important**: Use TEST mode first to avoid real money transfers during testing

## Troubleshooting

### "CORS policy" error
- Edge Function is not deployed or URL is wrong
- Solution: Deploy via dashboard

### "PAYSTACK_SECRET_KEY not configured"
- Secret environment variable not set
- Solution: Add it in Edge Function secrets

### "404 Not Found"
- Function doesn't exist
- Solution: Deploy the function

### "Failed to create transfer recipient"
- Paystack credentials invalid
- Bank account details incorrect
- Solution: Check Paystack dashboard for error details

## After Deployment

1. Refresh your browser (Ctrl+F5)
2. Try withdrawing a small amount (₦100)
3. Check Supabase Edge Function logs for any errors
4. Check Paystack dashboard for transfer status
