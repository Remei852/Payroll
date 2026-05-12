# Quick Start Guide

## For Developers (Building the Installer)

### First Time Setup
```powershell
# Install dependencies
npm install
```

### Build the Installer
```powershell
# This creates the standalone installer
npm run dist
```

**Output:** `dist-electron/Payroll System Setup 1.0.0.exe`

**What it does:**
- Downloads PHP 8.2 (first time only, cached in `resources-php/`)
- Builds React frontend
- Clears Laravel caches
- Packages everything into a Windows installer

**Time:** ~5-10 minutes first time, ~2-3 minutes after

---

## For End Users (Installing the App)

### Installation
1. Double-click `Payroll System Setup 1.0.0.exe`
2. Wait for installation (auto-installs VC++ Redist if needed)
3. App launches automatically after install

**No admin rights needed** - installs to your user folder

### First Launch
- Shows "Starting up, please wait..." splash screen
- Creates database and storage folders
- Takes ~10-30 seconds on first launch
- Subsequent launches are faster (~5 seconds)

### Data Location
All your data is stored at:
```
%AppData%\Payroll System\
  ├── database.sqlite      (your database)
  └── storage\
      ├── logs\            (error logs)
      ├── framework\       (sessions, cache)
      └── app\             (uploaded files)
```

---

## Troubleshooting

### 500 Server Error
Run this script to check the error logs:
```powershell
powershell -ExecutionPolicy Bypass -File check-logs.ps1
```

Or manually open:
```
%AppData%\Payroll System\storage\logs\laravel.log
```

### App Won't Start
1. Check if VC++ Redist is installed (should auto-install)
2. Check Task Manager for orphaned `php.exe` processes (kill them)
3. Try reinstalling the app

### Clean Reinstall
1. Uninstall the app
2. Delete `%AppData%\Payroll System` (removes all data)
3. Reinstall

---

## Development Mode

### Run Locally (Without Building)
```powershell
# Terminal 1: Start Laravel dev server
php artisan serve

# Terminal 2: Start Vite dev server
npm run dev

# Terminal 3: Start Electron
npm run electron
```

**Note:** Development mode uses system PHP and local database/storage.

---

## Key Files

- `electron/main.js` - Electron app entry point
- `build-electron.ps1` - Build script
- `package.json` - Electron config
- `.env` - Laravel environment config
- `resources-php/` - Bundled PHP runtime (created during build)

---

## Support

- Build issues: See `BUILD_README.md`
- Runtime issues: See `ELECTRON_TROUBLESHOOTING.md`
- 500 errors: See `FIXES_FOR_500_ERROR.md`
