<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScheduleOverrideController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\WorkScheduleController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    // Main attendance page - shows records with upload functionality
    Route::get('/attendance', [AttendanceController::class, 'records'])->name('admin.attendance.index');
    
    // Backward compatibility redirects
    Route::get('/attendance/upload-logs', function () {
        return redirect()->route('admin.attendance.index');
    });
    Route::get('/attendance/records', function () {
        return redirect()->route('admin.attendance.index');
    });
    
    // Upload and process endpoints
    Route::post('/attendance/upload-logs', [AttendanceController::class, 'storeUpload'])->name('admin.attendance.store-upload');
    Route::post('/attendance/process-logs', [AttendanceController::class, 'processLogs'])->name('admin.attendance.process-logs');

    Route::get('/attendance/summary', function () {
        return Inertia::render('Attendance/Summary');
    })->name('admin.attendance.summary');

    Route::get('/attendance/missing-logs', function () {
        return Inertia::render('Attendance/MissingLogs');
    })->name('admin.attendance.missing-logs');

    Route::get('/letters', function () {
        return Inertia::render('Letters/Index');
    })->name('admin.letters.index');

    Route::get('/letters/generate-notice', function () {
        return Inertia::render('Letters/GenerateNotice');
    })->name('admin.letters.generate-notice');

    Route::get('/letters/history', function () {
        return Inertia::render('Letters/History');
    })->name('admin.letters.history');

    Route::get('/payroll', function () {
        return Inertia::render('Payroll/Index');
    })->name('admin.payroll.index');

    Route::get('/payroll/periods', function () {
        return Inertia::render('Payroll/Periods');
    })->name('admin.payroll.periods');

    Route::get('/payroll/generate', function () {
        return Inertia::render('Payroll/Generate');
    })->name('admin.payroll.generate');

    Route::get('/payroll/summary', function () {
        return Inertia::render('Payroll/Summary');
    })->name('admin.payroll.summary');

    Route::get('/payroll/payslips', function () {
        return Inertia::render('Payroll/Payslips');
    })->name('admin.payroll.payslips');

    Route::get('/departments', function () {
        return Inertia::render('Departments/Manage');
    })->name('admin.departments.manage');

    Route::get('/work-schedules', function () {
        return Inertia::render('WorkSchedules/Index');
    })->name('admin.work-schedules.index');

    Route::get('/employees', [EmployeeController::class, 'index'])->name('admin.employees.index');

    // Employee API routes
    Route::prefix('api')->group(function () {
        Route::get('/employees', [\App\Http\Controllers\Api\EmployeeController::class, 'index'])->name('api.employees.index');
        Route::post('/employees', [\App\Http\Controllers\Api\EmployeeController::class, 'store'])->name('api.employees.store');
        Route::get('/employees/{id}', [\App\Http\Controllers\Api\EmployeeController::class, 'show'])->name('api.employees.show');
        Route::put('/employees/{id}', [\App\Http\Controllers\Api\EmployeeController::class, 'update'])->name('api.employees.update');
    });

    // Settings - Unified page with tabs
    Route::get('/settings', [SettingsController::class, 'index'])->name('admin.settings.index');
    
    // Work Schedules Management (only update - create/delete handled by departments)
    Route::put('/settings/work-schedules/{workSchedule}', [WorkScheduleController::class, 'update'])->name('admin.settings.work-schedules.update');

    // Schedule Overrides Management
    Route::get('/settings/schedule-overrides', [ScheduleOverrideController::class, 'index'])->name('admin.settings.schedule-overrides');
    Route::post('/settings/schedule-overrides', [ScheduleOverrideController::class, 'store'])->name('admin.settings.schedule-overrides.store');
    Route::put('/settings/schedule-overrides/{scheduleOverride}', [ScheduleOverrideController::class, 'update'])->name('admin.settings.schedule-overrides.update');
    Route::delete('/settings/schedule-overrides/{scheduleOverride}', [ScheduleOverrideController::class, 'destroy'])->name('admin.settings.schedule-overrides.destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
