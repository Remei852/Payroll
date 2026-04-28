# build-electron.ps1
# Full build script: copies PHP, builds frontend, packages with electron-builder

$ErrorActionPreference = "Stop"

$phpSource = "C:\xampp\php"
$phpDest   = ".\resources-php"

Write-Host "==> Step 1: Copy PHP runtime..." -ForegroundColor Cyan
if (Test-Path $phpDest) { Remove-Item -Recurse -Force $phpDest }
New-Item -ItemType Directory -Path $phpDest | Out-Null

# Copy all DLLs except Apache-specific ones
$skipDlls = @("php8apache2_4.dll", "php8phpdbg.dll")
Get-ChildItem "$phpSource\*.dll" | Where-Object { $_.Name -notin $skipDlls } | ForEach-Object {
    Copy-Item $_.FullName $phpDest
    Write-Host "  Copied $($_.Name)"
}
Copy-Item "$phpSource\php.exe" $phpDest
Write-Host "  Copied php.exe"
Copy-Item "$phpSource\php8ts.dll" $phpDest -ErrorAction SilentlyContinue

# Copy ext folder
$extDest = Join-Path $phpDest "ext"
New-Item -ItemType Directory -Path $extDest | Out-Null
Get-ChildItem (Join-Path $phpSource "ext\*.dll") | ForEach-Object {
    Copy-Item $_.FullName $extDest
    Write-Host "  Copied ext\$($_.Name)"
}

# Create a minimal php.ini for production
$phpIni = @"
extension_dir = "ext"
extension=openssl
extension=pdo_sqlite
extension=sqlite3
extension=mbstring
extension=fileinfo
extension=curl
extension=dom
extension=xml
extension=bcmath
extension=ctype
extension=phar
extension=iconv
extension=tokenizer

memory_limit = 256M
max_execution_time = 60
date.timezone = Asia/Manila
"@
$phpIni | Out-File -FilePath (Join-Path $phpDest "php.ini") -Encoding ASCII
Write-Host "  Created php.ini"

Write-Host ""
Write-Host "==> Step 2: Build frontend assets..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Vite build failed" }

Write-Host ""
Write-Host "==> Step 3: Optimize Laravel for production..." -ForegroundColor Cyan
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

Write-Host ""
Write-Host "==> Step 4: Package with electron-builder..." -ForegroundColor Cyan
npx electron-builder --win --x64
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

Write-Host ""
Write-Host "==> Done! Installer is in dist-electron/" -ForegroundColor Green
