# build-electron.ps1
# Standalone build: bundles PHP, SQLite, VC++ Redist — no server or PHP required on target PC

$ErrorActionPreference = "Stop"

$phpDest = ".\resources-php"

Write-Host "==> Step 1: Prepare PHP runtime..." -ForegroundColor Cyan

if (-not (Test-Path "$phpDest\php.exe")) {
    Write-Host "  Downloading official PHP 8.2 NTS for Windows..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://windows.php.net/downloads/releases/latest/php-8.2-nts-Win32-vs16-x64-latest.zip" -OutFile "php-bundle.zip"

    if (Test-Path $phpDest) { Remove-Item -Recurse -Force $phpDest }
    New-Item -ItemType Directory -Path $phpDest | Out-Null
    New-Item -ItemType Directory -Path "$phpDest\ext" | Out-Null

    Expand-Archive -Path php-bundle.zip -DestinationPath php-extracted -Force

    Copy-Item php-extracted\php.exe $phpDest
    Copy-Item php-extracted\*.dll $phpDest

    $needed = @(
        "php_openssl.dll","php_pdo_sqlite.dll","php_sqlite3.dll",
        "php_mbstring.dll","php_fileinfo.dll","php_curl.dll",
        "php_intl.dll","php_sodium.dll","php_zip.dll"
    )
    foreach ($ext in $needed) {
        $src = "php-extracted\ext\$ext"
        if (Test-Path $src) { Copy-Item $src "$phpDest\ext\"; Write-Host "  Copied $ext" }
    }

    Remove-Item -Recurse -Force php-extracted
    Remove-Item php-bundle.zip
    Write-Host "  PHP ready"
} else {
    Write-Host "  PHP already present, skipping download"
}

# Write php.ini with absolute-safe extension_dir placeholder
# (main.js rewrites this at runtime with the real absolute path)
$phpIni = @"
extension_dir = "ext"

extension=openssl
extension=pdo_sqlite
extension=sqlite3
extension=mbstring
extension=fileinfo
extension=curl
extension=intl
extension=sodium

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
Write-Host "==> Step 3: Clear any existing Laravel caches..." -ForegroundColor Cyan
# Remove any cached config from development
Remove-Item ".\bootstrap\cache\config.php" -ErrorAction SilentlyContinue
Remove-Item ".\bootstrap\cache\routes-v7.php" -ErrorAction SilentlyContinue
Remove-Item ".\bootstrap\cache\events.php" -ErrorAction SilentlyContinue
Write-Host "  Cleared bootstrap cache"

Write-Host ""
Write-Host "==> Step 4: Cache Laravel routes/views (skip config cache)..." -ForegroundColor Cyan
# Use the bundled PHP so the build machine doesn't need PHP installed
$bundledPhp = Resolve-Path "$phpDest\php.exe"

# Write a temporary php.ini with absolute ext path for build-time use
$extAbsPath = (Resolve-Path "$phpDest\ext").Path.Replace("\", "/")
$buildIni = @"
extension_dir = "$extAbsPath"

extension=openssl
extension=pdo_sqlite
extension=sqlite3
extension=mbstring
extension=fileinfo
extension=curl
extension=intl
extension=sodium

memory_limit = 256M
max_execution_time = 60
date.timezone = Asia/Manila
"@
$buildIni | Out-File -FilePath ".\build-php.ini" -Encoding ASCII

$env:APP_ENV = "production"
$env:APP_DEBUG = "false"
$env:DB_CONNECTION = "sqlite"
$env:DB_DATABASE = ""

# DO NOT cache config — it would bake in wrong paths and env values
# Config will be read from .env + runtime env vars set by main.js
# & $bundledPhp -c ".\build-php.ini" artisan config:cache

# These are safe to cache since they don't depend on runtime paths
& $bundledPhp -c ".\build-php.ini" artisan route:cache
& $bundledPhp -c ".\build-php.ini" artisan view:cache
& $bundledPhp -c ".\build-php.ini" artisan event:cache

Remove-Item ".\build-php.ini" -ErrorAction SilentlyContinue
Write-Host "  Laravel caches built (config cache skipped for runtime flexibility)"

Write-Host ""
Write-Host "==> Step 5: Package with electron-builder..." -ForegroundColor Cyan
npx electron-builder --win --x64
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

Write-Host ""
Write-Host "==> Done! Installer is in dist-electron/" -ForegroundColor Green
Write-Host "    The installer bundles PHP, SQLite, and VC++ Redist." -ForegroundColor Green
Write-Host "    No server, PHP, or Node.js required on the target machine." -ForegroundColor Green
