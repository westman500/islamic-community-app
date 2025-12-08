# Test Paystack Webhook Connection
# Verifies the webhook endpoint is accessible and responding

Write-Host "🔍 Testing Paystack Webhook Endpoint..." -ForegroundColor Cyan
Write-Host ""

$webhookUrl = "https://jtmmeumzjcldqukpqcfi.supabase.co/functions/v1/paystack-webhook"

Write-Host "Webhook URL: $webhookUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: Check if endpoint is accessible
Write-Host "Test 1: Checking endpoint accessibility..." -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri $webhookUrl -Method Options -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Endpoint is accessible (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Endpoint not accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  This means the edge function may not be deployed." -ForegroundColor Yellow
    Write-Host "Deploy it with: supabase functions deploy paystack-webhook" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Try POST without signature (should fail with 401)
Write-Host "Test 2: Testing webhook security (should reject without signature)..." -ForegroundColor White
try {
    $testPayload = @{
        event = "charge.success"
        data = @{
            reference = "TEST_REF_12345"
            amount = 10000
            status = "success"
        }
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri $webhookUrl -Method Post -Body $testPayload -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "⚠️  Endpoint accepted request without signature (Security issue!)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Endpoint correctly rejects unauthorized requests" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "1. If both tests passed, the webhook is deployed correctly" -ForegroundColor White
Write-Host "2. Next step: Update webhook URL in Paystack Dashboard" -ForegroundColor White
Write-Host "   - Go to: https://dashboard.paystack.com/#/settings/developers" -ForegroundColor Yellow
Write-Host "   - Set webhook URL to: $webhookUrl" -ForegroundColor Yellow
Write-Host "   - Enable events: charge.success, transfer.success, transfer.failed" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. After updating Paystack, test a real deposit in the app" -ForegroundColor White
Write-Host ""
