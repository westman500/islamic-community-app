# Supabase Edge Function Deployment Script
# This script helps you deploy the Agora token generation function

Write-Host "=== Supabase Edge Function Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if function file exists
if (!(Test-Path "supabase\functions\generate-agora-token\index.ts")) {
    Write-Host "Error: Function file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Function file found" -ForegroundColor Green
Write-Host ""

Write-Host "To deploy this function, follow these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to https://supabase.com/dashboard/project/jtmmeumzjcldqukpqcfi/functions" -ForegroundColor White
Write-Host ""
Write-Host "2. Click 'Create a new function' or 'Deploy function'" -ForegroundColor White
Write-Host ""
Write-Host "3. Name it: generate-agora-token" -ForegroundColor White
Write-Host ""
Write-Host "4. Copy the content from:" -ForegroundColor White
Write-Host "   supabase\functions\generate-agora-token\index.ts" -ForegroundColor Cyan
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
Write-Host "   # Deploy the function" -ForegroundColor Gray
Write-Host "   npx supabase functions deploy generate-agora-token" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan

# Open function file for easy copying
Write-Host ""
$openFile = Read-Host "Would you like to open the function file now? (Y/N)"
if ($openFile -eq "Y" -or $openFile -eq "y") {
    Start-Process notepad "supabase\functions\generate-agora-token\index.ts"
}
