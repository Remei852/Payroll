import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

// Function to get CSRF token from meta tag or cookie
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

// Set CSRF token from meta tag
const token = getCsrfToken();
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    window.axios.defaults.headers.common['X-XSRF-TOKEN'] = token;
} else {
    console.error('CSRF token not found: https://laravel.com/docs/csrf#csrf-x-csrf-token');
}

// Intercept requests to ensure CSRF token is always fresh
window.axios.interceptors.request.use(function (config) {
    const freshToken = getCsrfToken();
    if (freshToken) {
        config.headers['X-CSRF-TOKEN'] = freshToken;
        config.headers['X-XSRF-TOKEN'] = freshToken;
    }
    return config;
}, function (error) {
    return Promise.reject(error);
});

// Handle CSRF token mismatch errors
window.axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 419) {
            // CSRF token mismatch - reload the page to get a fresh token
            console.error('CSRF token mismatch detected. Reloading page...');
            alert('Your session has expired. The page will reload to refresh your session.');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

