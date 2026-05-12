# Fixes Applied for 500 Error on Fresh PC

## Root Cause

The 500 error was caused by **cached Laravel config files** being bundled with the app. These cached files contained:
- Wrong file paths (from the build machine)
- Wrong environment settings (development instead of production)
- Wrong database paths

When the app ran on a fresh PC, Laravel used these stale cached configs instead of reading the runtime environment variables set by `main.js`.

## Changes Made

### 1. Build Script (`build-electron.ps1`)

**Before:**
- Ran `php artisan config:cache` during build
- This baked in wrong paths and settings

**After:**
- **Skips** `config:cache` entirely
- Only caches routes, views, and events (which don't depend on runtime paths)
- Clears any existing cached config files before building
- Config is now read fresh at runtime from `.env` + environment variables

### 2. Electron Main (`electron/main.js`)

**Added:**
- Runs `config:clear` on startup to remove any stale cached config
- Creates `.gitignore` files in storage directories (Laravel expects these)
- Better error messages if bundled PHP is missing

### 3. Environment File (`.env`)

**Changed:**
- `APP_ENV=local` → `APP_ENV=production`
- `APP_DEBUG=true` → `APP_DEBUG=false`
- `APP_NAME=Laravel` → `APP_NAME="Payroll System"`

These are now production-safe defaults. The `main.js` still overrides key values at runtime (DB path, storage path, etc.).

### 4. Package Config (`package.json`)

**Changed:**
- Explicitly excludes `bootstrap/cache/*.php` files from being bundled
- Only includes `bootstrap/app.php`, `bootstrap/providers.php`, and `bootstrap/cache/.gitignore`

## How It Works Now

### Build Time:
1. Download PHP 8.2 (if not cached)
2. Build React frontend
3. **Clear all cached config files**
4. Cache routes/views/events (safe to cache)
5. Package with electron-builder

### Runtime (First Launch):
1. Create `%AppData%\Payroll System\` folder
2. Create storage directories with `.gitignore` files
3. Copy or create SQLite database
4. **Run `config:clear`** to ensure no stale cache
5. Start PHP server with runtime environment variables:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `DB_DATABASE=%AppData%\Payroll System\database.sqlite`
   - `STORAGE_PATH=%AppData%\Payroll System\storage`
6. Laravel reads `.env` + these runtime overrides
7. App starts successfully

## Testing the Fix

### On the Build Machine:
```powershell
# Clean build
Remove-Item -Recurse -Force dist-electron, bootstrap/cache/*.php
npm run dist
```

### On a Fresh PC:
1. Install the app from `dist-electron/Payroll System Setup 1.0.0.exe`
2. Run the app
3. Should start without 500 error

### If 500 Error Still Occurs:
```powershell
# Check the logs
powershell -ExecutionPolicy Bypass -File check-logs.ps1
```

Look for:
- "No application encryption key" → `.env` is missing or `APP_KEY` is empty
- "unable to open database file" → Database path is wrong or not writable
- "Call to undefined function" → PHP extension is missing
- Any other specific error message

## Files Changed

- ✅ `build-electron.ps1` - Skip config:cache, clear old caches
- ✅ `electron/main.js` - Run config:clear on startup, create .gitignore files
- ✅ `.env` - Production-safe defaults
- ✅ `package.json` - Exclude cached config files from bundle

## Files Added

- ✅ `BUILD_README.md` - Build instructions
- ✅ `ELECTRON_TROUBLESHOOTING.md` - Debugging guide
- ✅ `check-logs.ps1` - Quick log viewer script
- ✅ `FIXES_FOR_500_ERROR.md` - This file

## Next Steps

1. **Rebuild the installer** with the fixes:
   ```powershell
   npm run dist
   ```

2. **Test on a fresh PC** (or VM) to confirm the 500 error is gone

3. **If still getting 500**, run `check-logs.ps1` on the target PC and share the error message

## Why This Approach?

**Alternative approaches considered:**

❌ **Cache config with production values during build**
- Problem: Paths would still be wrong (build machine paths ≠ target PC paths)

❌ **Don't cache anything**
- Problem: Slower startup, routes/views would be compiled on every request

✅ **Current approach: Cache only path-independent files**
- Routes, views, events are safe to cache (no absolute paths)
- Config is read fresh at runtime (allows dynamic paths)
- Best of both worlds: fast startup + correct paths
