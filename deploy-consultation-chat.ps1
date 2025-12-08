# Deploy Consultation Messages and Chat System
# Run this script to create the consultation_messages table and enable real-time chat

Write-Host "Deploying Consultation Chat System..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is available
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Supabase CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    exit 1
}

# Run the migration
Write-Host "Running CREATE_CONSULTATION_MESSAGES.sql..." -ForegroundColor Green
supabase db push --file .\supabase\CREATE_CONSULTATION_MESSAGES.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Consultation chat system deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Features enabled:" -ForegroundColor Cyan
    Write-Host "  • Real-time consultation chat" -ForegroundColor White
    Write-Host "  • Countdown timer (auto-ends chat)" -ForegroundColor White
    Write-Host "  • 15-minute extensions (5 Masjid Coins)" -ForegroundColor White
    Write-Host "  • Scholar can set pricing & duration" -ForegroundColor White
    Write-Host "  • consultation_extension transaction type" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Test booking a consultation" -ForegroundColor White
    Write-Host "  2. Click 'Start Chat' to open consultation" -ForegroundColor White
    Write-Host "  3. Scholars can manage settings in /scholar-consultations" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "✗ Deployment failed. Check errors above." -ForegroundColor Red
    exit 1
}
