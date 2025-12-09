# Quick Fix: Add consultation_duration column
# Run this PowerShell script to add the missing column

Write-Host "Adding consultation_duration column to profiles table..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Run SQL in Supabase Dashboard" -ForegroundColor Yellow
Write-Host "  1. Go to your Supabase Dashboard" -ForegroundColor White
Write-Host "  2. Navigate to SQL Editor" -ForegroundColor White
Write-Host "  3. Paste and run this SQL:" -ForegroundColor White
Write-Host ""
Write-Host "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consultation_duration INTEGER DEFAULT 30;" -ForegroundColor Green
Write-Host ""
Write-Host "Option 2: Use the SQL file" -ForegroundColor Yellow
Write-Host "  Open: .\supabase\QUICK_FIX_ADD_DURATION_COLUMN.sql" -ForegroundColor White
Write-Host "  Copy the SQL and run it in Supabase Dashboard" -ForegroundColor White
Write-Host ""
Write-Host "After adding the column, refresh your app to test!" -ForegroundColor Cyan
