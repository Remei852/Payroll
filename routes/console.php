<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule attendance violation detection to run daily at 11 PM
Schedule::command('attendance:detect-violations')
    ->dailyAt('23:00')
    ->withoutOverlapping()
    ->runInBackground();
