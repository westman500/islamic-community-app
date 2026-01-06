# Smile ID Webhook Configuration
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SMILE ID WEBHOOK CONFIGURATION" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

$webhookUrl = "https://jtmmeumzjcldqukpqcfi.supabase.co/functions/v1/smileid-callback"

Write-Host "Webhook URL (Configure in Smile ID Dashboard):" -ForegroundColor Green
Write-Host $webhookUrl -ForegroundColor White
Write-Host ""

Write-Host "Copy this URL to your clipboard:" -ForegroundColor Yellow
Set-Clipboard -Value $webhookUrl
Write-Host "✅ Webhook URL copied to clipboard!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Login to Smile ID Dashboard:" -ForegroundColor White
Write-Host "   https://portal.usesmileid.com/`n" -ForegroundColor Cyan

Write-Host "2. Navigate to Settings > Webhooks" -ForegroundColor White
Write-Host ""

Write-Host "3. Add the webhook URL:" -ForegroundColor White
Write-Host "   $webhookUrl`n" -ForegroundColor Cyan

Write-Host "4. Select these events to receive:" -ForegroundColor White
Write-Host "   ✅ job.complete" -ForegroundColor Green
Write-Host "   ✅ job.result" -ForegroundColor Green
Write-Host "   ✅ verification.approved" -ForegroundColor Green
Write-Host "   ✅ verification.rejected`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WHAT HAPPENS AUTOMATICALLY" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "When verification completes:" -ForegroundColor White
Write-Host "  1. Smile ID sends webhook to the URL above" -ForegroundColor Cyan
Write-Host "  2. Edge Function updates verification_data table" -ForegroundColor Cyan
Write-Host "  3. If approved: Sets smileid_verified = true in profiles" -ForegroundColor Cyan
Write-Host "  4. Sends push notification to user" -ForegroundColor Cyan
Write-Host "  5. User sees verified badge in app`n" -ForegroundColor Cyan

Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Press Enter to open Smile ID Portal..." -ForegroundColor Yellow
Read-Host

Start-Process "https://portal.usesmileid.com/"
