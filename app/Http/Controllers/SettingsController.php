<?php

namespace App\Http\Controllers;

use App\Models\WorkSchedule;
use App\Models\ScheduleOverride;
use App\Models\Holiday;
use App\Models\Department;
use App\Models\DepartmentGracePeriodSettings;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index(Request $request)
    {
        $year = $request->get('year', now()->year);
        
        // Get all departments with their work schedules
        $departments = Department::with('workSchedule')
            ->orderBy('name', 'asc')
            ->get();
        
        // Get work schedules that are assigned to departments
        $workSchedules = $departments->filter(function ($department) {
            return $department->workSchedule !== null;
        })->map(function ($department) {
            return [
                'id' => $department->workSchedule->id,
                'name' => $department->workSchedule->name,
                'work_start_time' => $department->workSchedule->work_start_time,
                'work_end_time' => $department->workSchedule->work_end_time,
                'break_start_time' => $department->workSchedule->break_start_time,
                'break_end_time' => $department->workSchedule->break_end_time,
                'grace_period_minutes' => $department->workSchedule->grace_period_minutes,
                'is_working_day' => $department->workSchedule->is_working_day,
                'department_id' => $department->id,
                'department_name' => $department->name,
            ];
        })->values();
        
        // Get all schedule overrides for the year
        $scheduleOverrides = ScheduleOverride::whereYear('override_date', $year)
            ->orWhere('is_recurring', true)
            ->with(['department', 'employee', 'employees', 'schedule'])
            ->orderBy('override_date', 'asc')
            ->get();

        // Get all holidays (recurring ones will be expanded for the year)
        $holidays = Holiday::where('is_recurring', true)
            ->orWhereYear('holiday_date', $year)
            ->with(['department'])
            ->orderBy('holiday_date', 'asc')
            ->get();

        // Expand recurring entries for the current year
        $expandedOverrides = $this->expandRecurringOverrides($scheduleOverrides, $year);
        $expandedHolidays = $this->expandRecurringHolidays($holidays, $year);

        // Merge holidays and overrides for the calendar display
        $allOverrides = $expandedOverrides->concat($expandedHolidays)->sortBy('override_date')->values();

        // Get all departments
        $departments = Department::orderBy('name', 'asc')->get();

        // Get grace period settings for all departments
        $gracePeriodSettings = DepartmentGracePeriodSettings::with('department')
            ->get()
            ->keyBy('department_id');

        return Inertia::render('Settings/Index', [
            'workSchedules' => $workSchedules,
            'scheduleOverrides' => $allOverrides,
            'departments' => $departments,
            'gracePeriodSettings' => $gracePeriodSettings,
            'currentYear' => $year,
        ]);
    }

    private function expandRecurringOverrides($overrides, $year)
    {
        $expanded = [];
        
        foreach ($overrides as $override) {
            if ($override->is_recurring) {
                // Create instance for the requested year
                $overrideDate = $override->override_date;
                $newDate = \Carbon\Carbon::create($year, $overrideDate->month, $overrideDate->day);
                
                $expanded[] = [
                    'id' => $override->id,
                    'override_date' => $newDate->format('Y-m-d'),
                    'department_id' => $override->department_id,
                    'employee_id' => $override->employee_id,
                    'schedule_id' => $override->schedule_id,
                    'override_type' => $override->override_type,
                    'reason' => $override->reason,
                    'opening_time' => $override->opening_time,
                    'closing_time' => $override->closing_time,
                    'is_paid' => $override->is_paid,
                    'is_recurring' => $override->is_recurring,
                    'department' => $override->department,
                    'employee' => $override->employee,
                    'employees' => $override->employees,
                    'schedule' => $override->schedule,
                    'original_date' => $overrideDate->format('Y-m-d'),
                ];
            } else {
                $expanded[] = $override;
            }
        }
        
        return collect($expanded)->sortBy('override_date')->values();
    }

    private function expandRecurringHolidays($holidays, $year)
    {
        $expanded = [];
        
        foreach ($holidays as $holiday) {
            if ($holiday->is_recurring) {
                // Create instance for the requested year
                $holidayDate = $holiday->holiday_date;
                $newDate = \Carbon\Carbon::create($year, $holidayDate->month, $holidayDate->day);
                
                // Map holiday type to override_type
                $overrideType = match($holiday->type) {
                    'Regular' => 'regular_holiday',
                    'Special' => 'special_holiday',
                    'Company' => 'company_holiday',
                    default => 'regular_holiday',
                };
                
                $expanded[] = [
                    'id' => 'holiday_' . $holiday->id, // Prefix to distinguish from schedule_overrides
                    'override_date' => $newDate->format('Y-m-d'),
                    'department_id' => $holiday->department_id,
                    'employee_id' => null,
                    'schedule_id' => null,
                    'override_type' => $overrideType,
                    'reason' => $holiday->name,
                    'opening_time' => null,
                    'closing_time' => null,
                    'rate_multiplier' => $holiday->rate_multiplier,
                    'is_paid' => $holiday->is_paid,
                    'is_recurring' => $holiday->is_recurring,
                    'department' => $holiday->department,
                    'employee' => null,
                    'employees' => collect([]),
                    'schedule' => null,
                    'original_date' => $holidayDate->format('Y-m-d'),
                    'is_from_holidays_table' => true, // Flag to identify holidays
                ];
            } else {
                // Non-recurring holiday for specific year
                $overrideType = match($holiday->type) {
                    'Regular' => 'regular_holiday',
                    'Special' => 'special_holiday',
                    'Company' => 'company_holiday',
                    default => 'regular_holiday',
                };
                
                $expanded[] = [
                    'id' => 'holiday_' . $holiday->id,
                    'override_date' => $holiday->holiday_date->format('Y-m-d'),
                    'department_id' => $holiday->department_id,
                    'employee_id' => null,
                    'schedule_id' => null,
                    'override_type' => $overrideType,
                    'reason' => $holiday->name,
                    'opening_time' => null,
                    'closing_time' => null,
                    'rate_multiplier' => $holiday->rate_multiplier,
                    'is_paid' => $holiday->is_paid,
                    'is_recurring' => $holiday->is_recurring,
                    'department' => $holiday->department,
                    'employee' => null,
                    'employees' => collect([]),
                    'schedule' => null,
                    'is_from_holidays_table' => true,
                ];
            }
        }
        
        return collect($expanded);
    }
}
