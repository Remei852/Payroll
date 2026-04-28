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
        //
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
