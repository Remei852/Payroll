# CSRF Token Mismatch Fix

## Issue
When editing departments, the system returns "CSRF token mismatch" error.

## Root Cause
The API routes use the `web` middleware which requires CSRF protection. The CSRF token handling in `bootstrap.js` needed to be more robust to handle:
1. Token expiration
2. Cookie-based tokens (XSRF-TOKEN)
3. Multiple token header formats

## Solution

### Enhanced CSRF Token Handling in `bootstrap.js`

#### 1. Improved Token Retrieval
```javascript
function getCsrfToken() {
    // Try meta tag first
    const metaToken = document.head.querySelector('meta[name="csrf-token"]');
    if (metaToken && metaToken.content) {
        return metaToken.content;
    }
    
    // Try cookie as fallback (Laravel uses XSRF-TOKEN cookie)
    const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (cookieMatch) {
        return decodeURIComponent(cookieMatch[1]);
    }
    
    return null;
}
```

#### 2. Multiple Header Formats
Now sets both `X-CSRF-TOKEN` and `X-XSRF-TOKEN` headers:
```javascript
config.headers['X-CSRF-TOKEN'] = freshToken;
config.headers['X-XSRF-TOKEN'] = freshToken;
```

#### 3. Better Error Handling
Enhanced 419 error handling with console logging:
```javascript
if (error.response && error.response.status === 419) {
    console.error('CSRF token mismatch detected. Reloading page...');
    alert('Your session has expired. The page will reload to refresh your session.');
    window.location.reload();
}
```

## How It Works

### Request Flow
1. **Page Load**: CSRF token loaded from meta tag `<meta name="csrf-token" content="...">`
2. **Axios Setup**: Token set in default headers
3. **Before Each Request**: Interceptor refreshes token from meta tag or cookie
4. **Request Sent**: Both `X-CSRF-TOKEN` and `X-XSRF-TOKEN` headers included
5. **Server Validation**: Laravel validates token
6. **On 419 Error**: Page reloads to get fresh token

### Token Sources (Priority Order)
1. **Meta Tag**: `<meta name="csrf-token" content="...">`
2. **Cookie**: `XSRF-TOKEN` cookie (Laravel's default)

## API Routes Configuration

The API routes use `web` middleware for CSRF protection:

```php
Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::apiResource('departments', DepartmentController::class);
    // ... other routes
});
```

This is correct because:
- ✅ Provides CSRF protection
- ✅ Maintains session state
- ✅ Works with Inertia.js
- ✅ Shares authentication with web routes

## Testing

### To Verify Fix:
1. Open Department management page
2. Edit a department
3. Submit changes
4. Should save successfully without CSRF error

### If Error Still Occurs:
1. Check browser console for CSRF token logs
2. Verify meta tag exists: `document.querySelector('meta[name="csrf-token"]')`
3. Check cookies for `XSRF-TOKEN`
4. Clear browser cache and reload
5. Check session configuration in `config/session.php`

## Session Configuration

Ensure session is configured correctly in `config/session.php`:
```php
'driver' => env('SESSION_DRIVER', 'file'),
'lifetime' => 120, // 2 hours
'expire_on_close' => false,
'encrypt' => false,
'http_only' => true,
'same_site' => 'lax',
```

## Common Causes of CSRF Errors

1. **Session Expired**: User idle for > session lifetime
2. **Cookie Issues**: Browser blocking cookies
3. **Cache Issues**: Old JavaScript cached
4. **Multiple Tabs**: Token refreshed in one tab, stale in another
5. **HTTPS Issues**: Mixed content or SSL problems

## Prevention

The enhanced implementation prevents CSRF errors by:
- ✅ Checking token freshness before each request
- ✅ Falling back to cookie if meta tag missing
- ✅ Auto-reloading on 419 errors
- ✅ Setting multiple header formats
- ✅ Logging errors for debugging

## Build Command
After changes, rebuild assets:
```bash
npm run build
```

Or for development:
```bash
npm run dev
```
