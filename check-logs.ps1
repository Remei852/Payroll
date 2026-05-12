# check-logs.ps1
# Quick script to view Laravel logs from the installed app

$appDataPath = "$env:APPDATA\Payroll System"
$logFile = "$appDataPath\storage\logs\laravel.log"

Write-Host "==> Checking Payroll System logs..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $appDataPath)) {
    Write-Host "App data folder not found at:" -ForegroundColor Red
    Write-Host $appDataPath
    Write-Host ""
    Write-Host "The app may not have been run yet." -ForegroundColor Yellow
    exit 1
}

Write-Host "App data location:" -ForegroundColor Green
Write-Host $appDataPath
Write-Host ""

if (-not (Test-Path $logFile)) {
    Write-Host "No log file found yet." -ForegroundColor Yellow
    Write-Host "Expected at: $logFile"
    Write-Host ""
    Write-Host "The app may not have started yet, or logging is not working." -ForegroundColor Yellow
    exit 1
}

Write-Host "==> Last 50 lines of laravel.log:" -ForegroundColor Cyan
Write-Host ""
Get-Content $logFile -Tail 50
Write-Host ""
Write-Host "==> Full log file location:" -ForegroundColor Cyan
Write-Host $logFile
Write-Host ""
Write-Host "Press any key to open the log file in Notepad..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
notepad $logFile
