<?php

namespace App\Console\Commands;

use App\Models\AttendanceLog;
use App\Models\AttendanceRecord;
use App\Models\WorkSchedule;
use App\Models\Employee;
use Illuminate\Console\Command;

class CheckAttendanceData extends Command
{
    protected $signature = 'attendance:check';
    protected $description = 'Check attendance data in database';

    public function handle()
    {
        $this->info('=== Attendance Data Check ===');
        $this->newLine();

        // Check logs
        $logsCount = AttendanceLog::count();
        $this->info("Attendance Logs: {$logsCount}");
        
        if ($logsCount > 0) {
            $firstLog = AttendanceLog::orderBy('log_datetime')->first();
            $lastLog = AttendanceLog::orderBy('log_datetime', 'desc')->first();
            $this->line("  First log: {$firstLog->log_datetime->format('Y-m-d H:i:s')} - {$firstLog->employee_code}");
            $this->line("  Last log: {$lastLog->log_datetime->format('Y-m-d H:i:s')} - {$lastLog->employee_code}");
            
            $uniqueEmployees = AttendanceLog::distinct('employee_code')->count('employee_code');
            $this->line("  Unique employees: {$uniqueEmployees}");
        }
        $this->newLine();

        // Check records
        $recordsCount = AttendanceRecord::count();
        $this->info("Attendance Records: {$recordsCount}");
        
        if ($recordsCount > 0) {
            $firstRecord = AttendanceRecord::orderBy('attendance_date')->first();
            $lastRecord = AttendanceRecord::orderBy('attendance_date', 'desc')->first();
            $this->line("  First record: {$firstRecord->attendance_date->format('Y-m-d')}");
            $this->line("  Last record: {$lastRecord->attendance_date->format('Y-m-d')}");
        }
        $this->newLine();

        // Check schedules
        $schedulesCount = WorkSchedule::count();
        $this->info("Work Schedules: {$schedulesCount}");
        
        if ($schedulesCount > 0) {
            $schedules = WorkSchedule::all();
            foreach ($schedules as $schedule) {
                $this->line("  - {$schedule->name}: {$schedule->time_in_am} - {$schedule->time_out_pm}");
            }
        }
        $this->newLine();

        // Check employees
        $employeesCount = Employee::count();
        $this->info("Employees: {$employeesCount}");
        $this->newLine();

        // Check for employees in logs but not in employees table
        if ($logsCount > 0) {
            $logEmployeeCodes = AttendanceLog::distinct()->pluck('employee_code');
            $employeeCodes = Employee::pluck('employee_code');
            $missing = $logEmployeeCodes->diff($employeeCodes);
            
            if ($missing->count() > 0) {
                $this->warn("Employees in logs but not in employees table:");
                foreach ($missing as $code) {
                    $this->line("  - {$code}");
                }
            } else {
                $this->info("All employees in logs exist in employees table ✓");
            }
        }

        return 0;
    }
}
