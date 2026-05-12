<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\DepartmentGracePeriodSettings;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PayrollService
{
    /**
     * Generate payroll for a specific period and department
     */
    public function generatePayroll(PayrollPeriod $period): array
    {
        $employees = Employee::where('department_id', $period->department_id)
            ->where('employment_status', 'ACTIVE')
            ->get();

        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
            'warnings' => [],
        ];

        // Check for employees with zero daily rates
        $zeroRateEmployees = $employees->filter(fn($e) => (float) $e->daily_rate === 0.0);
        if ($zeroRateEmployees->count() > 0) {
            $results['warnings'][] = [
                'type' => 'ZERO_DAILY_RATE',
                'message' => $zeroRateEmployees->count() . ' employee(s) have zero daily rate and will generate zero payroll',
                'employees' => $zeroRateEmployees->map(fn($e) => $e->first_name . ' ' . $e->last_name)->toArray(),
            ];
        }

        // Check for employees with no attendance records
        $employeesWithoutAttendance = [];
        foreach ($employees as $employee) {
            $attendanceCount = AttendanceRecord::where('employee_id', $employee->id)
                ->whereBetween('attendance_date', [$period->start_date, $period->end_date])
                ->count();
            
            if ($attendanceCount === 0) {
                $employeesWithoutAttendance[] = $employee->first_name . ' ' . $employee->last_name;
            }
        }

        if (count($employeesWithoutAttendance) > 0) {
            $results['warnings'][] = [
                'type' => 'NO_ATTENDANCE',
                'message' => count($employeesWithoutAttendance) . ' employee(s) have no attendance records for this period',
                'employees' => $employeesWithoutAttendance,
            ];
        }

        DB::beginTransaction();
        try {
            foreach ($employees as $employee) {
                try {
                    $this->generateEmployeePayroll($period, $employee);
                    $results['success']++;
                } catch (\Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'employee' => $employee->first_name . ' ' . $employee->last_name,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }

        return $results;
    }

    /**
     * Generate payroll for a single employee
     */
    public function generateEmployeePayroll(PayrollPeriod $period, Employee $employee): Payroll
    {
        // Get attendance records for the period
        $attendanceRecords = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$period->start_date, $period->end_date])
            ->get();

        // Calculate payroll components
        $calculation = $this->calculatePayroll($employee, $attendanceRecords, $period);

        // Create or update payroll record
        $payroll = Payroll::updateOrCreate(
            [
                'payroll_period_id' => $period->id,
                'employee_id' => $employee->id,
            ],
            [
                'gross_pay' => $calculation['gross_pay'],
                'total_earnings' => $calculation['total_earnings'],
                'total_deductions' => $calculation['total_deductions'],
                'net_pay' => $calculation['net_pay'],
                'status' => 'DRAFT',
                'generated_at' => now(),
            ]
        );

        // Delete existing items and create new ones
        $payroll->items()->delete();

        // Create earning items
        foreach ($calculation['earnings'] as $earning) {
            PayrollItem::create([
                'payroll_id' => $payroll->id,
                'type' => 'EARNING',
                'category' => $earning['category'],
                'amount' => $earning['amount'],
                'reference_id' => $earning['reference_id'] ?? null,
            ]);
        }

        // Create deduction items
        foreach ($calculation['deductions'] as $deduction) {
            PayrollItem::create([
                'payroll_id' => $payroll->id,
                'type' => 'DEDUCTION',
                'category' => $deduction['category'],
                'amount' => $deduction['amount'],
                'reference_id' => $deduction['reference_id'] ?? null,
            ]);
        }

        // Auto-include active cash advances as deductions
        // Only include advances that are truly Active (not deducted in any other period)
        // and whose deduct_on date falls within this period (or is null = deduct immediately)
        $activeAdvances = $employee->cashAdvances()
            ->where('status', 'Active')
            ->whereNull('payroll_period_id')
            ->where(function ($q) use ($period) {
                $q->whereNull('deduct_on')
                  ->orWhereBetween('deduct_on', [$period->start_date, $period->end_date]);
            })
            ->orderBy('created_at')
            ->get();
        foreach ($activeAdvances as $advance) {
            PayrollItem::create([
                'payroll_id'   => $payroll->id,
                'type'         => 'DEDUCTION',
                'category'     => 'Cash Advance',
                'amount'       => $advance->amount,
                'reference_id' => $advance->id,
            ]);
            $advance->update([
                'status'            => 'Deducted',
                'deducted_at'       => now(),
                'payroll_period_id' => $period->id,
            ]);
        }

        // Recalculate totals if cash advances were added
        if ($activeAdvances->isNotEmpty()) {
            $totalEarnings   = $payroll->earnings()->sum('amount');
            $totalDeductions = $payroll->deductions()->sum('amount');
            $payroll->update([
                'total_deductions' => $totalDeductions,
                'net_pay'          => $totalEarnings - $totalDeductions,
            ]);
        }

        return $payroll->fresh(['items']);
    }

    /**
     * Calculate payroll for an employee based on attendance records
     */
    public function calculatePayroll(Employee $employee, $attendanceRecords, PayrollPeriod $period = null): array
    {
        // Convert daily_rate to float to ensure proper calculation
        $dailyRate = (float) $employee->daily_rate;
        $hourlyRate = $dailyRate / 8; // Assuming 8-hour workday

        // Initialize counters
        $daysWorked = 0;
        $totalOvertimeMinutes = 0;
        $totalLateMinutes = 0;
        $totalUndertimeMinutes = 0;

        // Process attendance records
        foreach ($attendanceRecords as $record) {
            // Convert rendered to float
            $daysWorked += (float) $record->rendered; // rendered is the workday credit (0.0 to 1.0)
            $totalOvertimeMinutes += (int) $record->overtime_minutes;
            $totalLateMinutes += (int) ($record->total_late_minutes ?? ($record->late_minutes_am + $record->late_minutes_pm));
            $totalUndertimeMinutes += (int) $record->undertime_minutes;
        }

        // Log for debugging
        \Log::info('Payroll Calculation Debug', [
            'employee_id' => $employee->id,
            'employee_name' => $employee->first_name . ' ' . $employee->last_name,
            'daily_rate' => $dailyRate,
            'attendance_records_count' => $attendanceRecords->count(),
            'days_worked' => $daysWorked,
            'overtime_minutes' => $totalOvertimeMinutes,
            'late_minutes' => $totalLateMinutes,
            'undertime_minutes' => $totalUndertimeMinutes,
        ]);

        // Calculate earnings
        $basicPay = round($daysWorked * $dailyRate, 2);
        $overtimePay = round(($totalOvertimeMinutes / 60) * $hourlyRate * 1.25, 2); // 1.25x for overtime

        $earnings = [
            [
                'category' => 'Basic Pay',
                'amount' => $basicPay,
                'reference_id' => null,
            ],
        ];

        if ($overtimePay > 0) {
            $earnings[] = [
                'category' => 'Overtime Pay',
                'amount' => $overtimePay,
                'reference_id' => null,
            ];
        }

        // Calculate deductions
        $schedule = $employee->department?->workSchedule;

        $graceSettings = null;
        if ($employee->department_id) {
            $graceSettings = DepartmentGracePeriodSettings::where('department_id', $employee->department_id)->first();
        }

        $graceBankEnabled = (bool) ($graceSettings->cumulative_tracking_enabled ?? false);

        if ($graceBankEnabled && $period) {
            $periodGraceBankMinutes = (int) ($graceSettings->grace_period_limit_minutes ?? DepartmentGracePeriodSettings::DEFAULT_GRACE_PERIOD_MINUTES);

            $graceCoveredMinutes = min(max(0, $totalLateMinutes), max(0, $periodGraceBankMinutes));
            $billableLateMinutes = max(0, $totalLateMinutes - $graceCoveredMinutes);
        } else {
            $dailyGraceMinutes = $graceSettings 
                ? (int) ($graceSettings->daily_grace_minutes ?? DepartmentGracePeriodSettings::DEFAULT_DAILY_GRACE_MINUTES)
                : DepartmentGracePeriodSettings::DEFAULT_DAILY_GRACE_MINUTES;

            $billableLateMinutes = 0;
            foreach ($attendanceRecords as $record) {
                $lateAm = (int) ($record->late_minutes_am ?? 0);
                $latePm = (int) ($record->late_minutes_pm ?? 0);

                // If lateAm/latePm is already 0 (was within grace period), this adds 0.
                // If it's > 0 (exceeded grace period), it deducts the grace period to find the billable amount.
                if ($lateAm > 0) {
                    $billableLateMinutes += max(0, $lateAm - $dailyGraceMinutes);
                }
                if ($latePm > 0) {
                    $billableLateMinutes += max(0, $latePm - $dailyGraceMinutes);
                }
            }
        }

        $latePenalty = round(($billableLateMinutes / 60) * $hourlyRate, 2);
        $undertimePenalty = round(($totalUndertimeMinutes / 60) * $hourlyRate, 2);

        $deductions = [];

        if ($latePenalty > 0) {
            $category = 'Late Penalty';
            $deductions[] = [
                'category' => $category,
                'amount' => $latePenalty,
                'reference_id' => null,
            ];
        }

        if ($undertimePenalty > 0) {
            $deductions[] = [
                'category' => 'Undertime Penalty',
                'amount' => $undertimePenalty,
                'reference_id' => null,
            ];
        }

        // Add employee contributions (SSS, PhilHealth, Pag-IBIG, etc.)
        // Prorate contributions based on pay period
        $contributions = $employee->contributions()->where('is_active', true)->get();
        
        \Log::info('Contributions Debug', [
            'employee_id' => $employee->id,
            'employee_name' => $employee->first_name . ' ' . $employee->last_name,
            'total_contributions' => $contributions->count(),
            'contributions' => $contributions->map(fn($c) => [
                'id' => $c->id,
                'type' => $c->contribution_type_id,
                'calculation_type' => $c->calculation_type,
                'amount_or_rate' => $c->amount_or_rate,
                'is_active' => $c->is_active,
            ])->toArray(),
        ]);
        
        foreach ($contributions as $contribution) {
            // Determine proration factor based on pay period
            $prorationFactor = $period ? $this->getContributionProrationFactor($period) : 1.0;
            
            // Get the contribution amount based on calculation type
            $baseAmount = 0;
            if ($contribution->calculation_type === 'FIXED') {
                $baseAmount = (float) $contribution->amount_or_rate;
            } elseif ($contribution->calculation_type === 'PERCENTAGE') {
                // Calculate percentage of basic pay
                $baseAmount = round($basicPay * ((float) $contribution->amount_or_rate / 100), 2);
            }
            
            $proratedAmount = round($baseAmount * $prorationFactor, 2);
            
            \Log::info('Contribution Calculation', [
                'contribution_type' => $contribution->contributionType->name ?? 'Unknown',
                'base_amount' => $baseAmount,
                'proration_factor' => $prorationFactor,
                'prorated_amount' => $proratedAmount,
            ]);
            
            if ($proratedAmount > 0) {
                $deductions[] = [
                    'category' => $contribution->contributionType->name,
                    'amount' => $proratedAmount,
                    'reference_id' => $contribution->id,
                ];
            }
        }

        // Calculate totals
        $totalEarnings = array_sum(array_column($earnings, 'amount'));
        $totalDeductions = array_sum(array_column($deductions, 'amount'));
        $grossPay = $basicPay + $overtimePay;
        $netPay = $totalEarnings - $totalDeductions;

        return [
            'gross_pay' => $grossPay,
            'total_earnings' => $totalEarnings,
            'total_deductions' => $totalDeductions,
            'net_pay' => $netPay,
            'earnings' => $earnings,
            'deductions' => $deductions,
            'summary' => [
                'days_worked' => $daysWorked,
                'hours_worked' => round($daysWorked * 8, 2),
                'overtime_hours' => round($totalOvertimeMinutes / 60, 2),
                'late_minutes' => $totalLateMinutes,
                'late_hours' => round($totalLateMinutes / 60, 2),
                'undertime_minutes' => $totalUndertimeMinutes,
                'undertime_hours' => round($totalUndertimeMinutes / 60, 2),
                'daily_rate' => $dailyRate,
                'hourly_rate' => round($hourlyRate, 2),
            ],
        ];
    }

    /**
     * Finalize payroll (lock it from further edits)
     */
    public function finalizePayroll(Payroll $payroll): void
    {
        $payroll->update(['status' => 'FINALIZED']);
    }

    /**
     * Finalize all payrolls in a period
     */
    public function finalizePeriod(PayrollPeriod $period): void
    {
        DB::transaction(function () use ($period) {
            $period->payrolls()->update(['status' => 'FINALIZED']);
            $period->update(['status' => 'CLOSED']);
        });
    }

    /**
     * Calculate contribution proration factor based on pay period length
     * Contributions are assumed to be monthly, so we prorate based on period length
     */
    private function getContributionProrationFactor(PayrollPeriod $period): float
    {
        $startDate = Carbon::parse($period->start_date);
        $endDate = Carbon::parse($period->end_date);
        $periodDays = $startDate->diffInDays($endDate) + 1; // +1 to include both start and end dates
        
        // Determine proration based on period length
        if ($periodDays <= 7) {
            // Weekly: 1/4 of monthly (approximately 4 weeks in a month)
            return 0.25;
        } elseif ($periodDays <= 16) {
            // Bi-monthly/Semi-monthly: 1/2 of monthly
            return 0.5;
        } elseif ($periodDays <= 31) {
            // Monthly: full amount
            return 1.0;
        } else {
            // For periods longer than a month, calculate proportionally
            return $periodDays / 30;
        }
    }
}
