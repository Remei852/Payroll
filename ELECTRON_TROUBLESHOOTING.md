# Electron App Troubleshooting Guide

## 500 Server Error on Fresh PC

If you get a 500 error when running the app on a fresh PC, check these:

### 1. Check the Laravel Log
The app stores logs in:
```
%AppData%\Payroll System\storage\logs\laravel.log
```

Open this file to see the actual error message.

### 2. Common Issues

**Missing APP_KEY**
- Error: "No application encryption key has been specified"
- Fix: The `.env` file must have a valid `APP_KEY=base64:...` line
- The current key is already set in `.env`

**Database Permission Error**
- Error: "unable to open database file"
- Fix: The app should auto-create the database in `%AppData%\Payroll System\database.sqlite`
- Check if the folder exists and is writable

**Missing PHP Extensions**
- Error: "Call to undefined function openssl_encrypt" or similar
- Fix: The bundled PHP should have all extensions. Check that `resources-php/ext/` has the DLL files

**Cached Config with Wrong Paths**
- Error: Various path-related errors
- Fix: The app runs `config:clear` on startup to prevent this
- If it persists, manually delete `%AppData%\Payroll System\bootstrap\cache\config.php`

### 3. Clean Reinstall

If all else fails:
1. Uninstall the app
2. Delete `%AppData%\Payroll System` (this removes all user data)
3. Reinstall from the latest build

### 4. Build Checklist

Before building the installer, ensure:
- [ ] `npm run build` completes successfully (frontend assets)
- [ ] `bootstrap/cache/config.php` does NOT exist (or will be cleared by build script)
- [ ] `.env` has `APP_ENV=production` and `APP_DEBUG=false`
- [ ] `resources-php/php.exe` exists (downloaded by build script)
- [ ] `build-resources/vc_redist.x64.exe` exists (for auto-install)

### 5. Development vs Production

**Development** (running `npm run electron` locally):
- Uses system PHP from PATH
- Uses local SQLite at `database/database.sqlite`
- Uses local storage at `storage/`
- Reads `.env` directly

**Production** (packaged app):
- Uses bundled PHP from `resources/php/php.exe`
- Uses SQLite at `%AppData%\Payroll System\database.sqlite`
- Uses storage at `%AppData%\Payroll System\storage/`
- Reads `.env` but overrides key values via environment variables set by `main.js`

### 6. Debugging Startup

To see console logs during startup:
1. Open the app
2. Press `Ctrl+Shift+I` to open DevTools (only works in development mode)
3. Check the Console tab for `[PHP]` and `[Startup]` messages

In production, check the Electron logs at:
```
%AppData%\Payroll System\logs\
```

### 7. Port Conflicts

If the app fails to start with "port already in use":
- The app auto-finds a free port, so this shouldn't happen
- If it does, check Task Manager for orphaned `php.exe` processes and kill them

### 8. VC++ Redistributable

The installer auto-installs VC++ Redist 2015-2022 x64. If PHP fails to start:
- Manually download and install from: https://aka.ms/vs/17/release/vc_redist.x64.exe
- Restart the app

## Build Command

```powershell
npm run dist
```

Output: `dist-electron/Payroll System Setup 1.0.0.exe`
