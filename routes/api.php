<?php

use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\ContributionTypeController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\PayrollController;
use App\Models\Employee;
use App\Models\CashAdvance;
use App\Models\Payroll;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group.
|
*/

Route::middleware(['web', 'auth', 'verified'])->group(function () {
    Route::get('contribution-types', [ContributionTypeController::class, 'index'])->name('api.contribution-types.index');
    Route::post('contribution-types', [ContributionTypeController::class, 'store'])->name('api.contribution-types.store');

    Route::get('departments/stats', [DepartmentController::class, 'stats'])->name('api.departments.stats');
    Route::apiResource('departments', DepartmentController::class)->only([
        'index',
        'store',
        'show',
        'update',
        'destroy',
    ]);

    Route::apiResource('employees', EmployeeController::class)->only([
        'index',
        'store',
        'show',
        'update',
        'destroy',
    ]);

    // Attendance violation letter endpoint
    Route::get('attendance/violations/{employeeId}', [AttendanceController::class, 'getViolations'])
        ->name('api.attendance.violations');
    
    // Attendance violation letter PDF download
    Route::get('attendance/violations/{employeeId}/pdf', [AttendanceController::class, 'downloadViolationPDF'])
        ->name('api.attendance.violations.pdf');

    // Attendance record edit and review endpoints
    Route::patch('attendance/records/{recordId}', [AttendanceController::class, 'updateRecord'])
        ->name('api.attendance.records.update');
    
    Route::get('attendance/records/{recordId}/changes', [AttendanceController::class, 'getChangeHistory'])
        ->name('api.attendance.records.changes');
    
    Route::post('attendance/validate-for-payroll', [AttendanceController::class, 'validateForPayroll'])
        ->name('api.attendance.validate-payroll');

    // Cash Advances Routes
    Route::model('employee', Employee::class);
    Route::model('cashAdvance', CashAdvance::class);
    Route::model('payroll', Payroll::class);

    Route::get('employees/{employee}/cash-advances', [PayrollController::class, 'getEmployeeCashAdvances'])
        ->name('api.employees.cash-advances.index');
    
    Route::post('employees/{employee}/cash-advances', [PayrollController::class, 'addCashAdvance'])
        ->name('api.employees.cash-advances.store');
    
    Route::delete('cash-advances/{cashAdvance}', [PayrollController::class, 'removeCashAdvance'])
        ->name('api.cash-advances.destroy');
    
    Route::post('payroll/{payroll}/apply-cash-advance', [PayrollController::class, 'applyCashAdvanceDeduction'])
        ->name('api.payroll.apply-cash-advance');
});

