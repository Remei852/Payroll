<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // When running inside Electron (production), redirect all writable paths
        // to the user's AppData directory so the app works on any PC.
        $storagePath = env('STORAGE_PATH');
        $dbPath      = env('DB_DATABASE');

        if ($storagePath) {
            $this->app->useStoragePath($storagePath);
            config([
                'session.files'                => $storagePath . '/framework/sessions',
                'cache.stores.file.path'       => $storagePath . '/framework/cache/data',
                'logging.channels.single.path' => $storagePath . '/logs/laravel.log',
                'logging.channels.daily.path'  => $storagePath . '/logs/laravel.log',
            ]);
        }

        if ($dbPath) {
            config(['database.connections.sqlite.database' => $dbPath]);
        }
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Auto-create the admin user if the users table exists but is empty.
        // This means after `php artisan migrate` (with no seed), the app is
        // immediately usable — no separate `php artisan db:seed` required.
        $this->ensureAdminExists();
    }

    private function ensureAdminExists(): void
    {
        try {
            // Only run if the users table exists (i.e. migrations have been run)
            if (!Schema::hasTable('users')) {
                return;
            }

            if (User::count() > 0) {
                return;
            }

            $email    = config('app.admin_email');
            $password = config('app.admin_password');

            if (!$email || !$password) {
                return;
            }

            User::create([
                'name'     => 'Administrator',
                'email'    => $email,
                'password' => $password,
            ]);
        } catch (\Throwable) {
            // Silently skip — table may not exist yet during initial migration
        }
    }
}
