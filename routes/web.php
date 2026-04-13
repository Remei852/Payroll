<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScheduleOverrideController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ViolationsController;
use App\Http\Controllers\WorkScheduleController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])->name('dashboard');

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
    Route::post('/attendance/process-file', [AttendanceController::class, 'processFile'])->name('admin.attendance.process-file');
    Route::delete('/attendance/uploads/{sourceFile}', [AttendanceController::class, 'deleteUpload'])->name('admin.attendance.uploads.destroy')->where('sourceFile', '.*');
    Route::get('/attendance/uploads/{sourceFile}/impact', [AttendanceController::class, 'checkDeleteImpact'])->name('admin.attendance.uploads.impact')->where('sourceFile', '.*');

    Route::get('/attendance/summary', function () {
        return Inertia::render('Attendance/Summary');
    })->name('admin.attendance.summary');

    Route::get('/attendance/missing-logs', function () {
        return Inertia::render('Attendance/MissingLogs');
    })->name('admin.attendance.missing-logs');

    // Payroll Management
    Route::get('/payroll', [\App\Http\Controllers\PayrollController::class, 'index'])->name('admin.payroll.index');
    Route::post('/payroll/generate', [\App\Http\Controllers\PayrollController::class, 'processGeneration'])->name('admin.payroll.process-generation');
    Route::get('/payroll/period/{id}', [\App\Http\Controllers\PayrollController::class, 'showPeriod'])->name('admin.payroll.period');
    Route::get('/payroll/period/{id}/print', [\App\Http\Controllers\PayrollController::class, 'printPeriod'])->name('admin.payroll.period.print');
    Route::post('/payroll/period/{id}/finalize', [\App\Http\Controllers\PayrollController::class, 'finalizePeriod'])->name('admin.payroll.finalize-period');
    Route::delete('/payroll/period/{id}', [\App\Http\Controllers\PayrollController::class, 'deletePeriod'])->name('admin.payroll.period.delete');
    Route::get('/payroll/payslip/{id}', [\App\Http\Controllers\PayrollController::class, 'showPayslip'])->name('admin.payroll.payslip');
    Route::post('/payroll/period/{periodId}/employee/{employeeId}/regenerate', [\App\Http\Controllers\PayrollController::class, 'regenerateEmployee'])->name('admin.payroll.regenerate-employee');

    Route::get('/departments', function () {
        return Inertia::render('Departments/Manage');
    })->name('admin.departments.manage');

    Route::get('/work-schedules', function () {
        return Inertia::render('WorkSchedules/Index');
    })->name('admin.work-schedules.index');

    Route::get('/employees', [EmployeeController::class, 'index'])->name('admin.employees.index');

    // Settings - Unified page with tabs
    Route::get('/settings', [SettingsController::class, 'index'])->name('admin.settings.index');
    
    // Violations Management
    Route::get('/violations', [ViolationsController::class, 'index'])->name('admin.violations.index');
    Route::get('/violations/export/csv', [ViolationsController::class, 'export'])->name('admin.violations.export');
    Route::post('/violations/bulk-print', [ViolationsController::class, 'bulkPrint'])->name('admin.violations.bulk-print');
    Route::get('/violations/{id}', [ViolationsController::class, 'show'])->name('admin.violations.show');
    Route::get('/violations/{id}/print', [ViolationsController::class, 'print'])->name('admin.violations.print');
    Route::patch('/violations/{id}/status', [ViolationsController::class, 'updateStatus'])->name('admin.violations.update-status');
    Route::patch('/violations/{id}/notes', [ViolationsController::class, 'updateNotes'])->name('admin.violations.update-notes');
    Route::post('/violations/{id}/dismiss', [ViolationsController::class, 'dismissViolation'])->name('admin.violations.dismiss');
    
    // Grace Period Settings
    Route::get('/settings/grace-period/{departmentId}', [ViolationsController::class, 'getGracePeriodSettings'])->name('admin.settings.grace-period.show');
    Route::put('/settings/grace-period/{departmentId}', [ViolationsController::class, 'updateGracePeriodSettings'])->name('admin.settings.grace-period.update');
    
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
