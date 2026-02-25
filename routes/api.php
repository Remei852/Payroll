<?php

use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\ContributionTypeController;
use App\Http\Controllers\Api\EmployeeController;
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
});

