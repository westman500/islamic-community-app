# Supabase Edge Function Deployment Script
# This script helps you deploy Edge Functions (Agora token, Paystack webhook)

Write-Host "=== Supabase Edge Function Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if function file exists
if (!(Test-Path "supabase\functions\generate-agora-token\index.ts")) {
    Write-Host "Error: generate-agora-token function file not found!" -ForegroundColor Red
} else {
    Write-Host "✓ generate-agora-token function file found" -ForegroundColor Green
}

if (!(Test-Path "supabase\functions\paystack-webhook\index.ts")) {
    Write-Host "Error: paystack-webhook function file not found!" -ForegroundColor Red
} else {
    Write-Host "✓ paystack-webhook function file found" -ForegroundColor Green
}

if (!(Test-Path "supabase\functions\delete-user-account\index.ts")) {
    Write-Host "Error: delete-user-account function file not found!" -ForegroundColor Red
} else {
    Write-Host "✓ delete-user-account function file found" -ForegroundColor Green
}
Write-Host ""

Write-Host "To deploy these functions, follow these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to https://supabase.com/dashboard/project/jtmmeumzjcldqukpqcfi/functions" -ForegroundColor White
Write-Host ""
Write-Host "2. Click 'Create a new function' or 'Deploy function'" -ForegroundColor White
Write-Host ""
Write-Host "3a. Name it: generate-agora-token" -ForegroundColor White
Write-Host ""
Write-Host "4. Copy the content from:" -ForegroundColor White
Write-Host "   supabase\functions\generate-agora-token\index.ts" -ForegroundColor Cyan
Write-Host "" 
Write-Host "3b. Name it: paystack-webhook" -ForegroundColor White
Write-Host "" 
Write-Host "4b. Copy the content from:" -ForegroundColor White
Write-Host "   supabase\functions\paystack-webhook\index.ts" -ForegroundColor Cyan
Write-Host ""
Write-Host "3c. Name it: delete-user-account" -ForegroundColor White
Write-Host "" 
Write-Host "4c. Copy the content from:" -ForegroundColor White
Write-Host "   supabase\functions\delete-user-account\index.ts" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Add these environment variables in Supabase Dashboard:" -ForegroundColor White
Write-Host "   - AGORA_APP_ID: 1a3cb8e2d1174dd097edcc38466983a0" -ForegroundColor Cyan
Write-Host "   - AGORA_APP_CERTIFICATE: [Your Agora App Certificate]" -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Or use Supabase CLI if you have it installed:" -ForegroundColor White
Write-Host ""
Write-Host "   # Login to Supabase" -ForegroundColor Gray
Write-Host "   npx supabase login" -ForegroundColor Cyan
Write-Host ""
Write-Host "   # Link to your project" -ForegroundColor Gray
Write-Host "   npx supabase link --project-ref jtmmeumzjcldqukpqcfi" -ForegroundColor Cyan
Write-Host ""
Write-Host "   # Set environment variables" -ForegroundColor Gray
Write-Host "   npx supabase secrets set AGORA_APP_ID=1a3cb8e2d1174dd097edcc38466983a0" -ForegroundColor Cyan
Write-Host "   npx supabase secrets set AGORA_APP_CERTIFICATE=your_certificate_here" -ForegroundColor Cyan
Write-Host ""
Write-Host "   # Deploy the functions" -ForegroundColor Gray
Write-Host "   npx supabase functions deploy generate-agora-token" -ForegroundColor Cyan
Write-Host "   npx supabase functions deploy paystack-webhook" -ForegroundColor Cyan
Write-Host "   npx supabase functions deploy delete-user-account" -ForegroundColor Cyan
Write-Host "" 
Write-Host "   # Set Paystack webhook secrets" -ForegroundColor Gray
Write-Host "   npx supabase secrets set SUPABASE_URL=<your_supabase_url>" -ForegroundColor Cyan
Write-Host "   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>" -ForegroundColor Cyan
Write-Host "   npx supabase secrets set PAYSTACK_WEBHOOK_SECRET=<your_paystack_webhook_secret>" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan

# Open function file for easy copying
Write-Host ""
$openFile = Read-Host "Open a function file now? (agora/paystack/delete/none)"
switch ($openFile) {
    "agora" { Start-Process notepad "supabase\functions\generate-agora-token\index.ts" }
    "paystack" { Start-Process notepad "supabase\functions\paystack-webhook\index.ts" }
    "delete" { Start-Process notepad "supabase\functions\delete-user-account\index.ts" }
    default { Write-Host "Skipped opening files." -ForegroundColor Yellow }
}
