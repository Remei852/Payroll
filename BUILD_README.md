# Building the Standalone Electron App

## Prerequisites (Build Machine Only)

- Node.js 18+ with npm
- Internet connection (to download PHP during first build)

**You do NOT need:**
- PHP installed on the build machine (the script downloads and uses a bundled copy)
- Any web server
- MySQL or other database

## Build Steps

1. **Install dependencies** (first time only):
```powershell
npm install
```

2. **Build the installer**:
```powershell
npm run dist
```

This will:
- Download PHP 8.2 NTS if not already cached (saved to `resources-php/`)
- Build the React frontend with Vite
- Clear any development caches
- Cache Laravel routes/views (but NOT config, to allow runtime flexibility)
- Package everything with electron-builder
- Create a Windows installer in `dist-electron/`

## Output

After a successful build, you'll find:
```
dist-electron/
  └── Payroll System Setup 1.0.0.exe  (the installer)
```

## What Gets Bundled

The installer includes:
- ✅ Electron app (the window/UI)
- ✅ PHP 8.2 runtime with extensions (openssl, sqlite, mbstring, etc.)
- ✅ Laravel backend (all PHP code)
- ✅ React frontend (compiled assets)
- ✅ SQLite database engine
- ✅ VC++ Redistributable 2015-2022 x64 (auto-installs if missing)

## What Does NOT Get Bundled

- ❌ User data (database, logs, sessions) — created at `%AppData%\Payroll System\` on first run
- ❌ Cached config files (cleared during build to prevent path issues)

## Target PC Requirements

The installer works on any Windows 10/11 PC with:
- No PHP required
- No Node.js required
- No web server required
- No admin rights required (installs per-user)
- VC++ Redist auto-installs if missing

## First Run Behavior

When a user runs the app for the first time:
1. Creates `%AppData%\Payroll System\` folder
2. Creates storage directories (sessions, cache, logs, etc.)
3. Copies or creates the SQLite database
4. Runs `config:clear` to ensure fresh config
5. Starts the bundled PHP server on a random free port
6. Opens the app window

## Troubleshooting

See `ELECTRON_TROUBLESHOOTING.md` for common issues and solutions.

## Development vs Production

**Development** (testing locally):
```powershell
npm run electron
```
- Uses system PHP
- Uses local database/storage
- Opens DevTools automatically

**Production** (packaged app):
- Uses bundled PHP
- Uses `%AppData%` for database/storage
- No DevTools (unless you add a menu option)

## Updating the App

To release a new version:
1. Update `version` in `package.json`
2. Run `npm run dist`
3. Distribute the new `.exe` installer

Users can install over the old version. Their data in `%AppData%` is preserved.

## Clean Build

If you encounter build issues:
```powershell
# Clear all caches and build artifacts
Remove-Item -Recurse -Force node_modules, dist-electron, resources-php, bootstrap/cache/*.php

# Reinstall and rebuild
npm install
npm run dist
```
