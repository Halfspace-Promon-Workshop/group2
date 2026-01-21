# PowerShell script to start the worker process
# Run this in a separate terminal: .\START-WORKER.ps1

Write-Host "Starting Shield Monitor Worker..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

npm run worker
