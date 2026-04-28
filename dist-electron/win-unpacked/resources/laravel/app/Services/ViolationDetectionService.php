<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\AttendanceViolation;
use App\Models\DepartmentGracePeriodSettings;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ViolationDetectionService
{
    /**
     * Run violation detection for all employees for a specific date.
     * Called by daily scheduled command.
     *
     * @param Carbon $date The date to detect violations for
     * @return array Summary of violations detected
     */
    public function detectViolationsForDate(Carbon $date): array
    {
        $summary = [
            'date' => $date->toDateString(),
            'employees_processed' => 0,
            'violations_created' => 0,
            'violations_by_type' => [],
            'errors' => [],
        ];

        // Get all active employees
        $employees = Employee::whereNull('deleted_at')->get();

        foreach ($employees as $employee) {
            try {
                $violations = $this->detectViolationsForEmployee(
                    $employee->id,
                    $date,
                    $date
                );

                $summary['employees_processed']++;
                $summary['violations_created'] += count($violations);

                foreach ($violations as $violation) {
                    $type = $violation['violation_type'];
                    $summary['violations_by_type'][$type] = 
                        ($summary['violations_by_type'][$type] ?? 0) + 1;
                }
            } catch (\Exception $e) {
                $summary['errors'][] = [
                    'employee_id' => $employee->id,
                    'employee_code' => $employee->employee_code,
                    'error' => $e->getMessage(),
                ];

                Log::error('Violation detection failed for employee', [
                    'employee_id' => $employee->id,
                    'employee_code' => $employee->employee_code,
                    'date' => $date->toDateString(),
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        return $summary;
    }

    /**
     * Run violation detection for a specific employee and date range.
     * Used for manual reprocessing or testing.
     *
     * @param int $employeeId The employee ID
     * @param Carbon $startDate Start of date range
     * @param Carbon $endDate End of date range
     * @return array Array of created violations
     */
    public function detectViolationsForEmployee(
        int $employeeId,
        Carbon $startDate,
        Carbon $endDate
    ): array {
        $employee = Employee::findOrFail($employeeId);
        $violations = [];

        // Detect each violation type
        $detectionMethods = [
            'detectCumulativeGracePeriodViolation',
            'detectUnexcusedAbsence',
            'detectAWOL',
            'detectBiometricsViolation',
            'detectMissingLogsPattern',
            'detectUnauthorizedWork',
            'detectExcessiveUndertime',
            'detectFrequentHalfDay',
        ];

        foreach ($detectionMethods as $method) {
            try {
                $violation = $this->$method($employee, $endDate);
                if ($violation) {
                    $violations[] = $violation;
                }
            } catch (\Exception $e) {
                Log::error("Violation detection method failed: {$method}", [
                    'employee_id' => $employeeId,
                    'date' => $endDate->toDateString(),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $violations;
    }

    /**
     * Detect cumulative grace period violations for an employee.
     *
     * @param Employee $employee
     * @param Carbon $date
     * @return array|null Violation data or null if no violation
     */
    protected function detectCumulativeGracePeriodViolation(
        Employee $employee,
        Carbon $date
    ): ?array {
        // Get grace period settings for employee's department
        $settings = $this->getGracePeriodSettings($employee->department_id);

        // Skip if cumulative tracking is disabled
        if (!$settings->cumulative_tracking_enabled) {
            return null;
        }

        // Calculate tracking period date range
        [$trackingStart, $trackingEnd] = $this->getTrackingPeriodRange(
            $date,
            $settings->tracking_period,
            $settings
        );

        // Sum late minutes within tracking period
        $lateRecords = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$trackingStart, $trackingEnd])
            ->where(function ($query) {
                $query->where('late_minutes_am', '>', 0)
                    ->orWhere('late_minutes_pm', '>', 0);
            })
            ->get();

        $totalLateMinutes = $lateRecords->sum(function ($record) {
            return ($record->late_minutes_am ?? 0) + ($record->late_minutes_pm ?? 0);
        });

        // Check if threshold exceeded
        if ($totalLateMinutes < $settings->grace_period_limit_minutes) {
            return null;
        }

        // Check if violation already exists for this period
        $existingViolation = AttendanceViolation::where('employee_id', $employee->id)
            ->where('violation_type', 'Cumulative Grace Period Exceeded')
            ->where('violation_date', '>=', $trackingStart)
            ->where('violation_date', '<=', $trackingEnd)
            ->first();

        if ($existingViolation) {
            return null;
        }

        // Build affected dates breakdown
        $affectedDates = $lateRecords->map(function ($record) {
            return [
                'date' => $record->attendance_date->toDateString(),
                'late_am' => $record->late_minutes_am ?? 0,
                'late_pm' => $record->late_minutes_pm ?? 0,
            ];
        })->toArray();

        $deductibleMinutes = $totalLateMinutes - $settings->grace_period_limit_minutes;

        // Create violation record
        $violationData = [
            'employee_id' => $employee->id,
            'violation_date' => $date,
            'violation_type' => 'Cumulative Grace Period Exceeded',
            'severity' => 'High',
            'status' => 'Pending',
            'details' => sprintf(
                'Employee exceeded cumulative grace period limit. Total late: %d minutes, ' .
                'Grace period limit: %d minutes, Deductible minutes: %d. ' .
                'Salary deduction will be applied for minutes exceeding the grace period limit.',
                $totalLateMinutes,
                $settings->grace_period_limit_minutes,
                $deductibleMinutes
            ),
            'metadata' => [
                'total_late_minutes' => $totalLateMinutes,
                'grace_period_used' => $totalLateMinutes,
                'grace_period_limit' => $settings->grace_period_limit_minutes,
                'deductible_minutes' => $deductibleMinutes,
                'tracking_period' => $settings->tracking_period,
                'tracking_start' => $trackingStart->toDateString(),
                'tracking_end' => $trackingEnd->toDateString(),
                'affected_dates' => $affectedDates,
            ],
        ];

        AttendanceViolation::create($violationData);

        return $violationData;
    }

    /**
     * Detect unexcused absence violations.
     *
     * @param Employee $employee
     * @param Carbon $date
     * @return array|null Violation data or null if no violation
     */
    protected function detectUnexcusedAbsence(
        Employee $employee,
        Carbon $date
    ): ?array {
        // Query for absence records (not excused)
        $absenceRecord = AttendanceRecord::where('employee_id', $employee->id)
            ->where('attendance_date', $date)
            ->where('status', 'Absent')
            ->first();

        if (!$absenceRecord) {
            return null;
        }

        // Check if violation already exists
        $existingViolation = AttendanceViolation::where('employee_id', $employee->id)
            ->where('violation_type', 'Unexcused Absence')
            ->where('violation_date', $date)
            ->first();

        if ($existingViolation) {
            return null;
        }

        // Create violation record
        $violationData = [
            'employee_id' => $employee->id,
            'violation_date' => $date,
            'violation_type' => 'Unexcused Absence',
            'severity' => 'High',
            'status' => 'Pending',
            'details' => 'Employee was absent without approved leave. This results in no pay for the day and potential short suspension.',
            'metadata' => [
                'absence_date' => $date->toDateString(),
            ],
        ];

        AttendanceViolation::create($violationData);

        return $violationData;
    }

    /**
     * Detect AWOL (3 consecutive absences).
     *
     * @param Employee $employee
     * @param Carbon $date
     * @return array|null Violation data or null if no violation
     */
    protected function detectAWOL(
        Employee $employee,
        Carbon $date
    ): ?array {
        // Get last 10 days of attendance records to check for consecutive absences
        $startDate = $date->copy()->subDays(10);
        
        $records = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$startDate, $date])
            ->where('status', 'Absent')
            ->orderBy('attendance_date', 'asc')
            ->get();

        if ($records->count() < 3) {
            return null;
        }

        // Get holidays for the employee's department
        $holidays = Holiday::where(function ($query) use ($employee) {
                $query->whereNull('department_id')
                    ->orWhere('department_id', $employee->department_id);
            })
            ->whereBetween('holiday_date', [$startDate, $date])
            ->pluck('holiday_date')
            ->map(fn($d) => $d->toDateString())
            ->toArray();

        // Check for 3 consecutive working days (excluding weekends and holidays)
        $consecutiveDates = [];
        $previousDate = null;

        foreach ($records as $record) {
            $currentDate = $record->attendance_date;

            // Skip if it's a weekend (Saturday or Sunday)
            if ($currentDate->isWeekend()) {
                continue;
            }

            // Skip if it's a holiday
            if (in_array($currentDate->toDateString(), $holidays)) {
                continue;
            }

            if ($previousDate === null) {
                $consecutiveDates = [$currentDate];
            } else {
                // Check if dates are consecutive working days
                $isConsecutive = $this->areConsecutiveWorkingDays($previousDate, $currentDate, $holidays);
                
                if ($isConsecutive) {
                    $consecutiveDates[] = $currentDate;

                    if (count($consecutiveDates) === 3) {
                        break;
                    }
                } else {
                    $consecutiveDates = [$currentDate];
                }
            }

            $previousDate = $currentDate;
        }

        if (count($consecutiveDates) < 3) {
            return null;
        }

        // Check if violation already exists for this AWOL period
        $firstAbsenceDate = $consecutiveDates[0];
        $lastAbsenceDate = $consecutiveDates[2];

        $existingViolation = AttendanceViolation::where('employee_id', $employee->id)
            ->where('violation_type', 'AWOL')
            ->where('violation_date', '>=', $firstAbsenceDate)
            ->where('violation_date', '<=', $lastAbsenceDate)
            ->first();

        if ($existingViolation) {
            return null;
        }

        // Create violation record
        $consecutiveDateStrings = array_map(
            fn($d) => $d->toDateString(),
            $consecutiveDates
        );

        $violationData = [
            'employee_id' => $employee->id,
            'violation_date' => $lastAbsenceDate,
            'violation_type' => 'AWOL',
            'severity' => 'Critical',
            'status' => 'Pending',
            'details' => 'Employee has 3 consecutive unexcused absences. AWOL constitutes neglect of duty and just cause for termination after due process.',
            'metadata' => [
                'consecutive_dates' => $consecutiveDateStrings,
                'absence_count' => 3,
            ],
        ];

        AttendanceViolation::create($violationData);

        return $violationData;
    }

    /**
     * Detect biometrics policy violations (missing timestamps).
     *
     * @param Employee $employee
     * @param Carbon $date
     * @return array|null Violation data or null if no violation
     */
    protected function detectBiometricsViolation(
        Employee $employee,
        Carbon $date
    ): ?array {
        $record = AttendanceRecord::where('employee_id', $employee->id)
            ->where('attendance_date', $date)
            ->first();

        if (!$record) {
            return null;
        }

        // Check for missing timestamps
        $missingTimeInAm = is_null($record->time_in_am);
        $missingTimeOutPm = is_null($record->time_out_pm);

        if (!$missingTimeInAm && !$missingTimeOutPm) {
            return null;
        }

        // Check if violation already exists
        $existingViolation = AttendanceViolation::where('employee_id', $employee->id)
            ->where('violation_type', 'Biometrics Policy Violation')
            ->where('violation_date', $date)
            ->first();

        if ($existingViolation) {
            return null;
        }

        // Determine severity
        $severity = ($missingTimeInAm && $missingTimeOutPm) ? 'High' : 'Medium';

        // Build missing timestamps list
        $missingTimestamps = [];
        if ($missingTimeInAm) {
            $missingTimestamps[] = 'time_in_am';
        }
        if ($missingTimeOutPm) {
            $missingTimestamps[] = 'time_out_pm';
        }

        // Create violation record
        $violationData = [
            'employee_id' => $employee->id,
            'violation_date' => $date,
            'violation_type' => 'Biometrics Policy Violation',
            'severity' => $severity,
            'status' => 'Pending',
            'details' => 'Missing biometric entries. Missing biometric entries result in the day being considered absent and logbook entries are not honored by HR.',
            'metadata' => [
                'missing_timestamps' => $missingTimestamps,
                'has_time_in_am' => !$missingTimeInAm,
                'has_time_out_lunch' => !is_null($record->time_out_lunch),
                'has_time_in_pm' => !is_null($record->time_in_pm),
                'has_time_out_pm' => !$missingTimeOutPm,
            ],
        ];

        AttendanceViolation::create($violationData);

        return $violationData;
    }

    /**
     * Detect missing logs pattern (3+ occurrences in 30 days).
     *
     * @param Employee $employee
     * @param Carbon $date
     * @return array|null Violation data or null if no violation
     */
    protected function detectMissingLogsPattern(
        Employee $employee,
        Carbon $date
    ): ?array {
        $startDate = $date->copy()->subDays(30);

        $records = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$startDate, $date])
            ->where('missed_logs_count', '>', 0)
            ->get();

        $occurrencesCount = $records->count();

        if ($occurrencesCount < 3) {
            return null;
        }

        // Check if violation already exists for this period
        $existingViolation = AttendanceViolation::where('employee_id', $employee->id)
            ->where('violation_type', 'Missing Logs')
            ->where('violation_date', '>=', $startDate)
            ->where('violation_date', '<=', $date)
            ->first();

        if ($existingViolation) {
            return null;
        }

        $totalMissedLogs = $records->sum('missed_logs_count');

        // Determine severity based on total missed logs
        if ($totalMissedLogs > 10) {
            $severity = 'High';
        } elseif ($totalMissedLogs >= 5) {
            $severity = 'Medium';
        } else {
            $severity = 'Low';
        }

        // Build affected dates
        $affectedDates = $records->map(function ($record) {
            return [
                'date' => $record->attendance_date->toDateString(),
                'missed_count' => $record->missed_logs_count,
            ];
        })->toArray();

        // Create violation record
        $violationData = [
            'employee_id' => $employee->id,
            'violation_date' => $date,
            'violation_type' => 'Missing Logs',
            'severity' => $severity,
            'status' => 'Pending',
            'details' => sprintf(
                'Employee has a pattern of missing logs: %d occurrences with %d total missed logs in the last 30 days.',
                $occurrencesCount,
                $totalMissedLogs
            ),
            'metadata' => [
                'occurrences_count' => $occurrencesCount,
                'total_missed_logs' => $totalMissedLogs,
                'date_range' => [
                    'start' => $startDate->toDateString(),
                    'end' => $date->toDateString(),
                ],
                'affected_dates' => $affectedDates,
            ],
        ];

        AttendanceViolation::create($violationData);

        return $violationData;
    }

    /**
     * Detect unauthorized work pattern (3+ occurrences in 30 days).
     *
     * @param Employee $employee
     * @param Carbon $date
     * @return array|null Violation data or null if no violation
     */
    protected function detectUnauthorizedWork(
        Employee $employee,
        Carbon $date
    ): ?array {
        $startDate = $date->copy()->subDays(30);

        $records = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$startDate, $date])
            ->where('status', 'Present - Unauthorized Work Day')
            ->get();

        $occurrencesCount = $records->count();

        if ($occurrencesCount === 0) {
            return null;
        }

        // Check if violation already exists for this period
        $existingViolation = AttendanceViolation::where('employee_id', $employee->id)
            ->where('violation_type', 'Unauthorized Work')
            ->where('violation_date', '>=', $startDate)
            ->where('violation_date', '<=', $date)
            ->first();

        if ($existingViolation) {
            return null;
        }

        // Determine severity
        $severity = ($occurrencesCount >= 3) ? 'High' : 'Medium';

        // Build unauthorized dates
        $unauthorizedDates = $records->pluck('attendance_date')
            ->map(fn($d) => $d->toDateString())
            ->toArray();

        // Create violation record
        $violationData = [
            'employee_id' => $employee->id,
            'violation_date' => $date,
            'violation_type' => 'Unauthorized Work',
            'severity' => $severity,
            'status' => 'Pending',
            'details' => sprintf(
                'Employee worked on unauthorized days: %d occurrences in the last 30 days.',
                $occurrencesCount
            ),
            'metadata' => [
                'occurrences_count' => $occurrencesCount,
                'date_range' => [
                    'start' => $startDate->toDateString(),
                    'end' => $date->toDateString(),
                ],
                'unauthorized_dates' => $unauthorizedDates,
            ],
        ];

        AttendanceViolation::create($violationData);

        return $violationData;
    }

    /**
     * Detect excessive undertime pattern (5+ occurrences in 30 days).
     *
     * @param Employee $employee
     * @param Carbon $date
     * @return array|null Violation data or null if no violation
     */
    protected function detectExcessiveUndertime(
        Employee $employee,
        Carbon $date
    ): ?array {
        $startDate = $date->copy()->subDays(30);

        $records = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$startDate, $date])
            ->where('undertime_minutes', '>', 0)
            ->get();

        $occurrencesCount = $records->count();

        if ($occurrencesCount < 5) {
            return null;
        }

        // Check if violation already exists for this period
        $existingViolation = AttendanceViolation::where('employee_id', $employee->id)
            ->where('violation_type', 'Excessive Undertime')
            ->where('violation_date', '>=', $startDate)
            ->where('violation_date', '<=', $date)
            ->first();

        if ($existingViolation) {
            return null;
        }

        $totalUndertimeMinutes = $records->sum('undertime_minutes');

        // Determine severity based on total undertime
        if ($totalUndertimeMinutes > 180) {
            $severity = 'High';
        } elseif ($totalUndertimeMinutes >= 90) {
            $severity = 'Medium';
        } else {
            $severity = 'Low';
        }

        // Build affected dates
        $affectedDates = $records->map(function ($record) {
            return [
                'date' => $record->attendance_date->toDateString(),
                'undertime_minutes' => $record->undertime_minutes,
            ];
        })->toArray();

        // Create violation record
        $violationData = [
            'employee_id' => $employee->id,
            'violation_date' => $date,
            'violation_type' => 'Excessive Undertime',
            'severity' => $severity,
            'status' => 'Pending',
            'details' => sprintf(
                'Employee has excessive undertime: %d occurrences with %d total undertime minutes in the last 30 days.',
                $occurrencesCount,
                $totalUndertimeMinutes
            ),
            'metadata' => [
                'occurrences_count' => $occurrencesCount,
                'total_undertime_minutes' => $totalUndertimeMinutes,
                'date_range' => [
                    'start' => $startDate->toDateString(),
                    'end' => $date->toDateString(),
                ],
                'affected_dates' => $affectedDates,
            ],
        ];

        AttendanceViolation::create($violationData);

        return $violationData;
    }

    /**
     * Detect frequent half-day pattern (4+ occurrences in 30 days).
     *
     * @param Employee $employee
     * @param Carbon $date
     * @return array|null Violation data or null if no violation
     */
    protected function detectFrequentHalfDay(
        Employee $employee,
        Carbon $date
    ): ?array {
        $startDate = $date->copy()->subDays(30);

        $records = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$startDate, $date])
            ->where('status', 'Half Day')
            ->get();

        $occurrencesCount = $records->count();

        if ($occurrencesCount < 4) {
            return null;
        }

        // Check if violation already exists for this period
        $existingViolation = AttendanceViolation::where('employee_id', $employee->id)
            ->where('violation_type', 'Frequent Half Day')
            ->where('violation_date', '>=', $startDate)
            ->where('violation_date', '<=', $date)
            ->first();

        if ($existingViolation) {
            return null;
        }

        // Determine severity
        $severity = ($occurrencesCount >= 6) ? 'High' : 'Medium';

        // Build half-day dates
        $halfDayDates = $records->pluck('attendance_date')
            ->map(fn($d) => $d->toDateString())
            ->toArray();

        // Create violation record
        $violationData = [
            'employee_id' => $employee->id,
            'violation_date' => $date,
            'violation_type' => 'Frequent Half Day',
            'severity' => $severity,
            'status' => 'Pending',
            'details' => sprintf(
                'Employee has frequent half-day attendance: %d occurrences in the last 30 days.',
                $occurrencesCount
            ),
            'metadata' => [
                'occurrences_count' => $occurrencesCount,
                'date_range' => [
                    'start' => $startDate->toDateString(),
                    'end' => $date->toDateString(),
                ],
                'half_day_dates' => $halfDayDates,
            ],
        ];

        AttendanceViolation::create($violationData);

        return $violationData;
    }

    /**
     * Get grace period settings for a department with fallback to defaults.
     *
     * @param int $departmentId
     * @return object Settings object with all required fields
     */
    protected function getGracePeriodSettings(int $departmentId): object
    {
        $settings = DepartmentGracePeriodSettings::where('department_id', $departmentId)->first();

        if ($settings) {
            return $settings;
        }

        // Return default settings
        return (object) [
            'department_id' => $departmentId,
            'cumulative_tracking_enabled' => DepartmentGracePeriodSettings::DEFAULT_CUMULATIVE_ENABLED,
            'grace_period_limit_minutes' => DepartmentGracePeriodSettings::DEFAULT_GRACE_PERIOD_MINUTES,
            'tracking_period' => DepartmentGracePeriodSettings::DEFAULT_TRACKING_PERIOD,
            'pay_period_start_day' => null,
            'pay_period_frequency' => null,
        ];
    }

    /**
     * Calculate tracking period date range based on settings.
     *
     * @param Carbon $date Current date
     * @param string $trackingPeriod Type of tracking period (monthly, pay_period, rolling_30)
     * @param object $settings Grace period settings object
     * @return array [Carbon $startDate, Carbon $endDate]
     */
    protected function getTrackingPeriodRange(
        Carbon $date,
        string $trackingPeriod,
        object $settings
    ): array {
        switch ($trackingPeriod) {
            case 'monthly':
                return [
                    $date->copy()->startOfMonth(),
                    $date->copy()->endOfMonth(),
                ];

            case 'pay_period':
                return $this->calculatePayPeriodRange($date, $settings);

            case 'rolling_30':
                return [
                    $date->copy()->subDays(30),
                    $date->copy(),
                ];

            default:
                // Default to monthly
                return [
                    $date->copy()->startOfMonth(),
                    $date->copy()->endOfMonth(),
                ];
        }
    }

    /**
     * Calculate pay period date range based on configuration.
     *
     * @param Carbon $date Current date
     * @param object $settings Grace period settings object
     * @return array [Carbon $startDate, Carbon $endDate]
     */
    protected function calculatePayPeriodRange(Carbon $date, object $settings): array
    {
        $startDay = $settings->pay_period_start_day ?? 1;
        $frequency = $settings->pay_period_frequency ?? 'monthly';

        switch ($frequency) {
            case 'weekly':
                // Find the most recent start day
                $startDate = $date->copy();
                while ($startDate->day !== $startDay) {
                    $startDate->subDay();
                    if ($startDate->diffInDays($date) > 7) {
                        break;
                    }
                }
                return [$startDate, $startDate->copy()->addDays(6)];

            case 'bi-weekly':
                // Find the most recent start day
                $startDate = $date->copy();
                while ($startDate->day !== $startDay) {
                    $startDate->subDay();
                    if ($startDate->diffInDays($date) > 14) {
                        break;
                    }
                }
                return [$startDate, $startDate->copy()->addDays(13)];

            case 'semi-monthly':
                // Two periods: 1-15 and 16-end of month
                if ($date->day <= 15) {
                    return [
                        $date->copy()->startOfMonth(),
                        $date->copy()->startOfMonth()->addDays(14),
                    ];
                } else {
                    return [
                        $date->copy()->startOfMonth()->addDays(15),
                        $date->copy()->endOfMonth(),
                    ];
                }

            case 'monthly':
            default:
                return [
                    $date->copy()->startOfMonth(),
                    $date->copy()->endOfMonth(),
                ];
        }
    }

    /**
     * Check if two dates are consecutive working days (excluding weekends and holidays).
     *
     * @param Carbon $date1 First date
     * @param Carbon $date2 Second date
     * @param array $holidays Array of holiday date strings
     * @return bool True if dates are consecutive working days
     */
    protected function areConsecutiveWorkingDays(Carbon $date1, Carbon $date2, array $holidays): bool
    {
        $currentDate = $date1->copy()->addDay();
        
        // Check each day between date1 and date2
        while ($currentDate->lte($date2)) {
            // If we've reached date2, check if it's the next working day
            if ($currentDate->equalTo($date2)) {
                return true;
            }
            
            // Skip weekends and holidays
            if (!$currentDate->isWeekend() && !in_array($currentDate->toDateString(), $holidays)) {
                // Found a working day between date1 and date2, so they're not consecutive
                return false;
            }
            
            $currentDate->addDay();
        }
        
        return false;
    }
}
