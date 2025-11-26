# Test script for College Information API (PowerShell)
# Run with: .\test-college-api.ps1

$testQueries = @(
    "give me college information",
    "give me the college information right now",
    "tell me about fees",
    "who is Prof. Lakshmi Durga",
    "what are the placements"
)

$apiBase = if ($env:API_BASE) { $env:API_BASE } else { "http://localhost:8080" }

Write-Host "🚀 Starting College Information API Tests" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green

$results = @()

foreach ($query in $testQueries) {
    Write-Host "`n🧪 Testing query: `"$query`"" -ForegroundColor Yellow
    Write-Host "📡 API URL: $apiBase/api/college/ask" -ForegroundColor Cyan
    
    try {
        $body = @{
            query = $query
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$apiBase/api/college/ask" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction Stop
        
        Write-Host "✅ Response status: 200" -ForegroundColor Green
        Write-Host "📦 Response data:" -ForegroundColor Cyan
        $response | ConvertTo-Json -Depth 10
        
        if ($response.answer) {
            Write-Host "📝 Answer length: $($response.answer.Length) characters" -ForegroundColor Cyan
            Write-Host "🎯 Type: $($response.type)" -ForegroundColor Cyan
            Write-Host "`n💬 Answer preview (first 200 chars):" -ForegroundColor Cyan
            Write-Host $response.answer.Substring(0, [Math]::Min(200, $response.answer.Length)) -ForegroundColor White
        }
        
        $results += @{
            query = $query
            success = $true
            answer = $response.answer
        }
    }
    catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
        $errorDetails = $_.ErrorDetails.Message
        if ($errorDetails) {
            Write-Host "📄 Error details: $errorDetails" -ForegroundColor Red
        }
        
        $results += @{
            query = $query
            success = $false
            answer = $null
        }
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Green
Write-Host "📊 Test Summary:" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green

for ($i = 0; $i -lt $results.Count; $i++) {
    $result = $results[$i]
    $status = if ($result.success) { "✅" } else { "❌" }
    Write-Host "$status Test $($i + 1): `"$($result.query)`"" -ForegroundColor $(if ($result.success) { "Green" } else { "Red" })
    if ($result.success -and $result.answer) {
        Write-Host "   Answer length: $($result.answer.Length) chars" -ForegroundColor Cyan
    }
}

$successCount = ($results | Where-Object { $_.success }).Count
$failCount = ($results | Where-Object { -not $_.success }).Count

Write-Host "`n" + ("=" * 60) -ForegroundColor Green
Write-Host "✅ Passed: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor Red
Write-Host "📊 Total: $($results.Count)" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Green

