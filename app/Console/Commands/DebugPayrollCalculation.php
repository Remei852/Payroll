<?php

namespace App\Console\Commands;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Services\PayrollService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class DebugPayrollCalculation extends Command
{
    protected $signature = 'payroll:debug {employee_id} {start_date} {end_date}';
    protected $description = 'Debug payroll calculation for a specific employee';

    public function handle(PayrollService $payrollService)
    {
        $employeeId = $this->argument('employee_id');
        $startDate = Carbon::parse($this->argument('start_date'));
        $endDate = Carbon::parse($this->argument('end_date'));

        $employee = Employee::find($employeeId);

        if (!$employee) {
            $this->error("Employee with ID {$employeeId} not found.");
            return 1;
        }

        $this->info("Employee: {$employee->first_name} {$employee->last_name}");
        $this->info("Employee Code: {$employee->employee_code}");
        $this->info("Daily Rate: ₱" . number_format($employee->daily_rate, 2));
        $this->info("Department: {$employee->department->name}");
        $this->info("Period: {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}");
        $this->newLine();

        // Get attendance records
        $attendanceRecords = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->orderBy('attendance_date')
            ->get();

        $this->info("Attendance Records Found: {$attendanceRecords->count()}");
        $this->newLine();

        if ($attendanceRecords->count() === 0) {
            $this->warn("No attendance records found for this period!");
            $this->info("Make sure you have processed attendance logs for this date range.");
            return 0;
        }

        // Display attendance records
        $this->table(
            ['Date', 'Rendered', 'Overtime (min)', 'Late (min)', 'Undertime (min)', 'Status'],
            $attendanceRecords->map(function ($record) {
                return [
                    $record->attendance_date->format('Y-m-d'),
                    $record->rendered,
                    $record->overtime_minutes,
                    $record->total_late_minutes ?? ($record->late_minutes_am + $record->late_minutes_pm),
                    $record->undertime_minutes,
                    $record->status ?? 'N/A',
                ];
            })
        );

        $this->newLine();

        // Calculate payroll
        $calculation = $payrollService->calculatePayroll($employee, $attendanceRecords);

        $this->info("=== PAYROLL CALCULATION ===");
        $this->info("Days Worked: {$calculation['summary']['days_worked']}");
        $this->info("Overtime Hours: {$calculation['summary']['overtime_hours']}");
        $this->info("Late Hours: {$calculation['summary']['late_hours']}");
        $this->info("Undertime Hours: {$calculation['summary']['undertime_hours']}");
        $this->newLine();

        $this->info("=== EARNINGS ===");
        foreach ($calculation['earnings'] as $earning) {
            $this->info("{$earning['category']}: ₱" . number_format($earning['amount'], 2));
        }
        $this->newLine();

        $this->info("=== DEDUCTIONS ===");
        if (empty($calculation['deductions'])) {
            $this->info("No deductions");
        } else {
            foreach ($calculation['deductions'] as $deduction) {
                $this->info("{$deduction['category']}: ₱" . number_format($deduction['amount'], 2));
            }
        }
        $this->newLine();

        $this->info("=== SUMMARY ===");
        $this->info("Gross Pay: ₱" . number_format($calculation['gross_pay'], 2));
        $this->info("Total Earnings: ₱" . number_format($calculation['total_earnings'], 2));
        $this->info("Total Deductions: ₱" . number_format($calculation['total_deductions'], 2));
        $this->info("Net Pay: ₱" . number_format($calculation['net_pay'], 2));

        return 0;
    }
}
