<?php

namespace App\Services;

use App\Models\AttendanceLog;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceService
{
    // Configuration constants
    private const GRACE_PERIOD_MINUTES = 15; // Late grace period
    private const EARLY_OUT_ALLOWANCE_MINUTES = 5; // Undertime allowance
    private const LUNCH_BREAK_START = '12:00:00'; // Standard lunch start
    private const LUNCH_BREAK_END = '13:00:00'; // Standard lunch end

    /**
     * Process CSV file and store attendance logs
     */
    public function processCsvFile(string $filePath, string $originalFileName): array
    {
        $results = [
            'success' => 0,
            'errors' => 0,
            'skipped' => 0,
            'messages' => [],
        ];

        if (!file_exists($filePath)) {
            throw new \Exception('File not found');
        }

        $file = fopen($filePath, 'r');
        $header = fgetcsv($file); // Skip header row

        $lineNumber = 1;
        while (($row = fgetcsv($file)) !== false) {
            $lineNumber++;
            
            try {
                // Parse CSV row
                $data = $this->parseCsvRow($row);
                
                if (!$data) {
                    $results['skipped']++;
                    continue;
                }

                // Store in attendance_logs
                AttendanceLog::create([
                    'employee_code' => $data['employee_code'],
                    'log_datetime' => $data['log_datetime'],
                    'log_type' => $data['log_type'],
                    'location' => $data['location'],
                    'source_file' => $originalFileName,
                ]);

                $results['success']++;
            } catch (\Exception $e) {
                $results['errors']++;
                $results['messages'][] = "Line {$lineNumber}: " . $e->getMessage();
                Log::error("CSV processing error on line {$lineNumber}", [
                    'error' => $e->getMessage(),
                    'row' => $row,
                ]);
            }
        }

        fclose($file);

        return $results;
    }

    /**
     * Parse a single CSV row
     */
    private function parseCsvRow(array $row): ?array
    {
        // CSV format: Employee ID, Department, Employee Name, Time, Date, Activity, Image, Address
        if (count($row) < 8) {
            return null;
        }

        $employeeCode = trim($row[0]);
        $time = trim($row[3]);
        $date = trim($row[4]);
        $activity = strtoupper(trim($row[5]));
        $address = trim($row[7]);

        if (empty($employeeCode) || empty($time) || empty($date) || empty($activity)) {
            return null;
        }

        // Parse date (format: MM/DD/YYYY)
        $dateParts = explode('/', $date);
        if (count($dateParts) !== 3) {
            throw new \Exception("Invalid date format: {$date}");
        }

        $dateString = sprintf('%04d-%02d-%02d', $dateParts[2], $dateParts[0], $dateParts[1]);
        $dateTimeString = $dateString . ' ' . $time;

        return [
            'employee_code' => $employeeCode,
            'log_datetime' => Carbon::parse($dateTimeString),
            'log_type' => $activity,
            'location' => $address,
        ];
    }

    /**
     * Process attendance logs into attendance records for a date range
     */
    public function processLogsToRecords(Carbon $startDate, Carbon $endDate): array
    {
        $results = [
            'processed' => 0,
            'errors' => 0,
            'messages' => [],
        ];

        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            try {
                $this->processDateLogs($currentDate);
                $results['processed']++;
            } catch (\Exception $e) {
                $results['errors']++;
                $results['messages'][] = "Error processing {$currentDate->format('Y-m-d')}: " . $e->getMessage();
                Log::error("Error processing attendance for date", [
                    'date' => $currentDate->format('Y-m-d'),
                    'error' => $e->getMessage(),
                ]);
            }

            $currentDate->addDay();
        }

        return $results;
    }

    /**
     * Process logs for a specific date
     */
    private function processDateLogs(Carbon $date): void
    {
        $dateString = $date->format('Y-m-d');

        Log::info("Processing logs for date", ['date' => $dateString]);

        // Get all logs for this date
        $logs = AttendanceLog::whereDate('log_datetime', $dateString)
            ->orderBy('log_datetime')
            ->get()
            ->groupBy('employee_code');

        Log::info("Found logs for date", ['date' => $dateString, 'employee_count' => $logs->count()]);

        // Get all active employees
        $allEmployees = Employee::whereNull('deleted_at')->get();

        foreach ($allEmployees as $employee) {
            $employeeLogs = $logs->get($employee->employee_code, collect());
            $this->processEmployeeLogs($employee->employee_code, $date, $employeeLogs);
        }
    }

    /**
     * Process logs for a specific employee on a specific date
     * Using time-range based approach for log assignment
     */
    private function processEmployeeLogs(string $employeeCode, Carbon $date, $logs): void
    {
        $employee = Employee::with('department.workSchedule')
            ->where('employee_code', $employeeCode)
            ->first();

        if (!$employee) {
            Log::warning("Employee not found", ['employee_code' => $employeeCode]);
            return;
        }

        // Check if date is a holiday
        $holiday = \App\Models\Holiday::whereDate('holiday_date', $date)->first();
        
        // Check if there's a schedule override for this employee/department/date
        // Priority: Employee-specific > Department-wide
        $override = $this->getOverrideForEmployee($employee, $date);

        // Get schedule based on department, holiday, or override
        $schedule = $this->getScheduleForEmployee($employee, $date, $holiday, $override);
        
        // Determine if this is a working day
        $isWorkingDay = $this->isWorkingDay($date, $schedule, $holiday, $override);

        // If no logs at all, create absent record
        if ($logs->isEmpty()) {
            // Create absent record if:
            // 1. It's a working day (regular absence tracking)
            // 2. There's a "no_work" override (need to track excused absences)
            // 3. It's a holiday (need to track holiday absences)
            $shouldCreateRecord = $isWorkingDay || 
                                  ($override && $override->override_type === 'no_work') ||
                                  $holiday;
            
            if ($shouldCreateRecord) {
                $this->createAbsentRecord($employee, $date, $schedule, $holiday, $override, $isWorkingDay);
            }
            return;
        }

        // STEP 1: Collect all logs for that date (already done by caller)
        
        // STEP 2: Sort logs by timestamp ascending
        $sortedLogs = $logs->sortBy('log_datetime')->values();

        // STEP 3: Remove exact duplicates (same time, same type)
        $uniqueLogs = $this->removeExactDuplicates($sortedLogs);

        // STEP 4: IGNORE log_type field - Infer types based on time and position
        // This is more reliable since employees often misclick IN/OUT buttons
        $inferredLogs = $this->inferLogTypesFromTime($uniqueLogs, $date);

        // STEP 5: Assign logs to time slots based on inferred types
        $timeSlots = $this->assignLogsToTimeSlotsFromInferred($inferredLogs, $date);

        // STEP 6: Pair IN-OUT and compute durations
        $pairs = $this->pairInOutLogs($inferredLogs);

        // STEP 7: Sum all valid durations
        $totalWorkedMinutes = array_sum(array_column($pairs, 'duration_minutes'));
        
        // Extract first IN and last OUT from time slots
        $firstIn = $timeSlots['morning_in'];
        $lastOut = $timeSlots['afternoon_out'];

        // IMPORTANT: If we have time slots but pairs calculation seems wrong,
        // use time slots to calculate worked hours (handles missed lunch logs)
        if ($firstIn && $lastOut && $totalWorkedMinutes < 240) {
            // If pairs show < 4 hours but we have morning IN and afternoon OUT,
            // calculate based on time slots instead
            $slotInTime = Carbon::parse($date->format('Y-m-d') . ' ' . $firstIn);
            $slotOutTime = Carbon::parse($date->format('Y-m-d') . ' ' . $lastOut);
            $slotMinutes = $slotInTime->diffInMinutes($slotOutTime);
            
            // If slot-based calculation is significantly higher, use it
            if ($slotMinutes > $totalWorkedMinutes + 60) {
                Log::info('Using time-slot based calculation instead of pairs', [
                    'employee_code' => $employeeCode,
                    'date' => $date->format('Y-m-d'),
                    'pair_minutes' => $totalWorkedMinutes,
                    'slot_minutes' => $slotMinutes,
                    'reason' => 'Missed lunch logs or misclicked logs',
                ]);
                $totalWorkedMinutes = $slotMinutes;
            }
        }

        // Handle lunch break
        $lunchDeducted = false;
        if (count($pairs) >= 2) {
            // Multiple pairs: lunch already excluded by pairing logic
            $lunchDeducted = true;
        } elseif (count($pairs) === 1) {
            // Single pair: check if it crosses lunch hours
            $pairStart = $pairs[0]['in_datetime'];
            $pairEnd = $pairs[0]['out_datetime'];
            
            $lunchStart = Carbon::parse($date->format('Y-m-d') . ' ' . self::LUNCH_BREAK_START);
            $lunchEnd = Carbon::parse($date->format('Y-m-d') . ' ' . self::LUNCH_BREAK_END);
            
            // If the single pair crosses lunch hours, deduct 1 hour
            if ($pairStart->lt($lunchStart) && $pairEnd->gt($lunchEnd)) {
                $totalWorkedMinutes -= 60; // Deduct 1 hour lunch
                $lunchDeducted = true;
            }
        } elseif ($totalWorkedMinutes > 360 && !$lunchDeducted) {
            // If worked > 6 hours and lunch not deducted yet, deduct it
            // This handles the time-slot based calculation
            $totalWorkedMinutes -= 60;
            $lunchDeducted = true;
        }
        
        $totalWorkedHours = $totalWorkedMinutes / 60;

        // Calculate flags - use time slot based times
        $isLateAM = $this->isLate($firstIn, $schedule);
        $isLatePM = $this->isLatePM($timeSlots['lunch_in'], $schedule);
        $isUndertime = $this->isUndertime($lastOut, $schedule);
        $hasIncompleteLogs = $this->hasIncompleteLogs($inferredLogs);
        $hasDuplicates = count($logs) !== count($uniqueLogs);

        // Calculate late minutes - AM and PM separately
        $lateMinutesAM = $this->calculateLateMinutes($firstIn, $schedule);
        $lateMinutesPM = $this->calculateLatePM($timeSlots['lunch_in'], $schedule);
        $totalLateMinutes = $lateMinutesAM + $lateMinutesPM;
        
        // Calculate overtime minutes
        $overtimeMinutes = $this->calculateOvertimeMinutes($lastOut, $schedule);
        
        // Calculate undertime minutes
        $undertimeMinutes = $this->calculateUndertimeMinutes($lastOut, $schedule);

        // Count missed logs (only if not absent)
        $missedLogsCount = $this->countMissedLogs($timeSlots, $pairs, $schedule);

        // Determine attendance status (after all flags are calculated)
        $status = $this->determineAttendanceStatus(
            $pairs,
            $firstIn,
            $lastOut,
            $totalWorkedHours,
            $schedule,
            $missedLogsCount > 0,
            $isLateAM,
            $isLatePM,
            $isWorkingDay,
            $holiday,
            $override,
            $timeSlots
        );

        // Calculate workday rendered based on status
        // 1.0 = full day, 0.5 = half day, 0.0 = absent
        $workdayRendered = $this->calculateWorkdayRendered($status, $totalWorkedHours, $schedule);

        // If status is "Absent", reset late minutes to 0
        $isAbsent = $status === 'Absent' || str_contains($status, 'Absent -');
        if ($isAbsent) {
            $lateMinutesAM = 0;
            $lateMinutesPM = 0;
            $totalLateMinutes = 0;
        }

        // Generate remarks including holiday/override info
        $remarks = $this->generateRemarks($status, $hasDuplicates, $hasIncompleteLogs, $lunchDeducted, count($pairs), $holiday, $override);

        // NOTE: We now CREATE records for unauthorized work on non-working days
        // This allows HR to see who worked on Sunday even without an override
        // The status "Present - Unauthorized Work Day" indicates it wasn't pre-approved
        // HR can then create an override retroactively if needed

        // Create or update attendance record
        AttendanceRecord::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'attendance_date' => $date->format('Y-m-d'),
            ],
            [
                'schedule_id' => $schedule->id,
                'time_in_am' => $timeSlots['morning_in'],
                'time_out_lunch' => $timeSlots['lunch_out'],
                'time_in_pm' => $timeSlots['lunch_in'],
                'time_out_pm' => $timeSlots['afternoon_out'],
                'late_minutes_am' => $isWorkingDay ? $lateMinutesAM : 0,
                'late_minutes_pm' => $isWorkingDay ? $lateMinutesPM : 0,
                // total_late_minutes is auto-calculated by database (generated column)
                'overtime_minutes' => $overtimeMinutes,
                'undertime_minutes' => $isWorkingDay ? $undertimeMinutes : 0,
                'rendered' => $workdayRendered,
                'missed_logs_count' => $isWorkingDay ? $missedLogsCount : 0,
                'status' => $status,
                'remarks' => $remarks,
            ]
        );

        // Detect and log violations (only for working days)
        // TEMPORARILY DISABLED: AttendanceViolation model not yet ready
        // if ($isWorkingDay) {
        //     $this->detectViolations(
        //         $employee,
        //         $date,
        //         $logs,
        //         $uniqueLogs,
        //         $timeSlots,
        //         $schedule,
        //         $lateMinutesAM,
        //         $lateMinutesPM,
        //         $undertimeMinutes,
        //         $missedLogsCount
        //     );
        // }
    }

    /**
     * Create attendance record for absent employee (no logs)
     * Only called for working days
     */
    private function createAbsentRecord(Employee $employee, Carbon $date, WorkSchedule $schedule, $holiday = null, $override = null, bool $isWorkingDay): void
    {
        // Determine status for absent employee
        $status = 'Absent';
        
        // If there's a no_work override, mark as excused
        if ($override && $override->override_type === 'no_work') {
            $status = 'Absent - Excused';
        }

        // Generate remarks
        $remarks = $this->generateRemarks($status, false, false, false, 0, $holiday, $override);

        // Create attendance record
        AttendanceRecord::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'attendance_date' => $date->format('Y-m-d'),
            ],
            [
                'schedule_id' => $schedule->id,
                'time_in_am' => null,
                'time_out_lunch' => null,
                'time_in_pm' => null,
                'time_out_pm' => null,
                'late_minutes_am' => 0,
                'late_minutes_pm' => 0,
                // total_late_minutes is auto-calculated by database (generated column)
                'overtime_minutes' => 0,
                'undertime_minutes' => 0,
                'rendered' => 0,
                'missed_logs_count' => 0,
                'status' => $status,
                'remarks' => $remarks,
            ]
        );
    }

    /**
     * Assign logs to time slots based on when they occur
     * Handles misclicked logs (e.g., two OUTs when one should be IN)
     */
    private function assignLogsToTimeSlots(array $logs, Carbon $date): array
    {
        $slots = [
            'morning_in' => null,
            'lunch_out' => null,
            'lunch_in' => null,
            'afternoon_out' => null,
        ];

        // Lunch boundary: 12:45 PM (765 minutes from midnight)
        $lunchBoundary = 765;

        // First pass: detect patterns and fix obvious mistakes
        $correctedLogs = $this->correctMisclickedLogs($logs);

        foreach ($correctedLogs as $log) {
            $time = $log['datetime'];
            $hour = (int) $time->format('H');
            $minute = (int) $time->format('i');
            $totalMinutes = ($hour * 60) + $minute;

            if ($log['type'] === 'IN') {
                // Morning IN: 6:00 AM - 11:59 AM (first IN in this range)
                if ($totalMinutes >= 360 && $totalMinutes < 720 && !$slots['morning_in']) {
                    $slots['morning_in'] = $log['time'];
                }
                // Lunch IN: 12:45 PM onwards (first IN at/after lunch boundary)
                elseif ($totalMinutes >= $lunchBoundary && !$slots['lunch_in']) {
                    $slots['lunch_in'] = $log['time'];
                }
                // If no morning IN was found, use any IN as morning IN
                elseif (!$slots['morning_in']) {
                    $slots['morning_in'] = $log['time'];
                }
            } elseif ($log['type'] === 'OUT') {
                // Lunch OUT: 11:00 AM - 12:45 PM (first OUT before lunch boundary)
                if ($totalMinutes >= 660 && $totalMinutes < $lunchBoundary && !$slots['lunch_out']) {
                    $slots['lunch_out'] = $log['time'];
                }
                // Afternoon OUT: 12:45 PM onwards (last OUT at/after lunch boundary)
                elseif ($totalMinutes >= $lunchBoundary) {
                    $slots['afternoon_out'] = $log['time'];
                }
                // If no lunch OUT was found and time is after 11 AM, use as lunch OUT
                elseif ($totalMinutes >= 660 && !$slots['lunch_out']) {
                    $slots['lunch_out'] = $log['time'];
                }
            }
        }

        return $slots;
    }

    /**
     * Correct misclicked logs (e.g., two consecutive OUTs when one should be IN)
     */
    private function correctMisclickedLogs(array $logs): array
    {
        $corrected = [];
        $prevLog = null;
        
        // Lunch boundary: 12:45 PM (765 minutes from midnight)
        // Before 12:45 = Lunch OUT period
        // At/After 12:45 = Lunch IN period
        $lunchBoundary = 765; // 12:45 PM in minutes

        foreach ($logs as $log) {
            $currentType = $log['type'];
            $time = $log['datetime'];
            $hour = (int) $time->format('H');
            $minute = (int) $time->format('i');
            $totalMinutes = ($hour * 60) + $minute;

            // RULE 1: Morning OUT followed by another OUT (likely first should be IN)
            // Example: OUT 08:05, OUT 12:00 → IN 08:05, OUT 12:00
            if ($prevLog && $prevLog['type'] === 'OUT' && $currentType === 'OUT') {
                $prevMinutes = ((int) $prevLog['datetime']->format('H') * 60) + (int) $prevLog['datetime']->format('i');
                
                // If first OUT is in morning (6 AM - 11:59 AM) and second is later
                // This is likely a morning clock-in misclick
                if ($prevMinutes >= 360 && $prevMinutes < 720 && $totalMinutes > $prevMinutes) {
                    $corrected[count($corrected) - 1]['type'] = 'IN';
                    
                    Log::info('Corrected misclicked log', [
                        'original' => 'OUT at ' . $prevLog['time'],
                        'corrected' => 'IN at ' . $prevLog['time'],
                        'reason' => 'Morning OUT followed by another OUT - first converted to IN'
                    ]);
                }
                // If both OUTs are in afternoon time range (AFTER 12:45 PM - 6:00 PM)
                // and they're more than 50 minutes apart, treat first OUT as IN
                // NOTE: Don't apply this to lunch period (before 12:45)
                elseif ($prevMinutes >= $lunchBoundary && $prevMinutes < 1080 && 
                    $totalMinutes >= $lunchBoundary && $totalMinutes < 1080 &&
                    ($totalMinutes - $prevMinutes) > 50) {
                    
                    // Change the previous OUT to IN (it was likely lunch return)
                    $corrected[count($corrected) - 1]['type'] = 'IN';
                    
                    Log::info('Corrected misclicked log', [
                        'original' => 'OUT at ' . $prevLog['time'],
                        'corrected' => 'IN at ' . $prevLog['time'],
                        'reason' => 'Two consecutive OUTs in afternoon (after 12:45), first converted to IN'
                    ]);
                }
            }
            
            // RULE 2: Consecutive INs with significant time gap (likely second should be OUT)
            // Example: IN 08:00, IN 12:00 → IN 08:00, OUT 12:00
            elseif ($prevLog && $prevLog['type'] === 'IN' && $currentType === 'IN') {
                $prevMinutes = ((int) $prevLog['datetime']->format('H') * 60) + (int) $prevLog['datetime']->format('i');
                $timeDiff = $totalMinutes - $prevMinutes;
                
                // If time gap is more than 2 hours, second IN is likely a misclicked OUT
                if ($timeDiff > 120) {
                    $log['type'] = 'OUT';
                    
                    Log::info('Corrected misclicked log', [
                        'original' => 'IN at ' . $log['time'],
                        'corrected' => 'OUT at ' . $log['time'],
                        'reason' => 'Two consecutive INs with ' . $timeDiff . ' min gap - second converted to OUT'
                    ]);
                }
            }
            
            // RULE 3: IN in Lunch OUT period (before 12:45 PM, during lunch hours)
            // Company Policy: Employees must clock OUT for lunch before/at 12:45 PM
            // Example: IN 08:00, OUT 12:00, IN 12:30 → IN 08:00, OUT 12:00, OUT 12:30
            if ($currentType === 'IN' && $totalMinutes >= 720 && $totalMinutes < $lunchBoundary) {
                // Check if this is in the lunch period (not morning arrival)
                // Count how many logs we have so far
                $logCount = count($corrected);
                
                // If we have at least 1 previous log, this could be a lunch misclick
                if ($logCount > 0) {
                    $prevMinutes = ((int) $prevLog['datetime']->format('H') * 60) + (int) $prevLog['datetime']->format('i');
                    
                    // Only correct if:
                    // 1. Previous log was OUT (meaning employee already clocked out for something)
                    // 2. Time gap is reasonable (5-90 minutes - typical lunch duration)
                    // 3. This is not the very first log of the day
                    $timeDiff = $totalMinutes - $prevMinutes;
                    if ($prevLog['type'] === 'OUT' && $timeDiff >= 5 && $timeDiff <= 90) {
                        $log['type'] = 'OUT';
                        
                        Log::info('Corrected misclicked log', [
                            'original' => 'IN at ' . $log['time'],
                            'corrected' => 'OUT at ' . $log['time'],
                            'reason' => 'IN before 12:45 PM in lunch period - converted to OUT (leaving for lunch)',
                            'time_diff' => $timeDiff . ' minutes from previous OUT'
                        ]);
                    }
                }
            }
            
            // RULE 4: OUT in Lunch IN period (at/after 12:45 PM, during lunch return hours)
            // Company Policy: Employees must clock IN from lunch at/after 12:45 PM
            // Example: IN 08:00, OUT 12:00, OUT 13:00 → IN 08:00, OUT 12:00, IN 13:00
            if ($currentType === 'OUT' && $totalMinutes >= $lunchBoundary && $totalMinutes < 840) {
                // 840 minutes = 2:00 PM (reasonable lunch return time)
                // Check if this could be a lunch return misclick
                $logCount = count($corrected);
                
                if ($logCount > 0 && $prevLog) {
                    $prevMinutes = ((int) $prevLog['datetime']->format('H') * 60) + (int) $prevLog['datetime']->format('i');
                    
                    // Only correct if:
                    // 1. Previous log was OUT (meaning employee left for lunch)
                    // 2. Time gap is reasonable (15-90 minutes - typical lunch duration)
                    // 3. Previous OUT was in the lunch OUT period (before 2:00 PM)
                    $timeDiff = $totalMinutes - $prevMinutes;
                    if ($prevLog['type'] === 'OUT' && $timeDiff >= 15 && $timeDiff <= 90 && $prevMinutes < 840) {
                        $log['type'] = 'IN';
                        
                        Log::info('Corrected misclicked log', [
                            'original' => 'OUT at ' . $log['time'],
                            'corrected' => 'IN at ' . $log['time'],
                            'reason' => 'OUT at/after 12:45 PM in lunch period - converted to IN (returning from lunch)',
                            'time_diff' => $timeDiff . ' minutes from previous OUT'
                        ]);
                    }
                }
            }

            $corrected[] = $log;
            $prevLog = $log;
        }

        return $corrected;
    }

    /**
     * STEP 3: Remove exact duplicates (same timestamp/type(in/out))
     */
    private function removeExactDuplicates($logs): \Illuminate\Support\Collection
    {
        $seen = [];
        return $logs->filter(function ($log) use (&$seen) {
            $key = $log->log_datetime->format('Y-m-d H:i:s') . '|' . strtoupper($log->log_type);
            if (isset($seen[$key])) {
                return false;
            }
            $seen[$key] = true;
            return true;
        })->values();
    }

    /**
     * STEP 4: Infer log types based on TIME, not button pressed
     * 
     * Strategy: Ignore the log_type field completely since employees misclick.
     * Instead, infer IN/OUT based on:
     * 1. Time of day (morning, lunch, afternoon)
     * 2. Position in sequence (alternating IN-OUT pattern)
     * 3. Expected pattern: IN-OUT-IN-OUT
     * 4. Remove logs that are too close together (< 2 minutes = double-tap)
     * 
     * Time Ranges:
     * - Morning IN: 6:00 AM - 11:59 AM (first log)
     * - Lunch OUT: 11:00 AM - 12:44 PM (second log)
     * - Lunch IN: 12:45 PM - 2:00 PM (third log)
     * - Afternoon OUT: 2:00 PM - 11:59 PM (fourth log)
     */
    private function inferLogTypesFromTime($logs, Carbon $date): array
    {
        // First, remove logs that are too close together (double-taps)
        $filtered = [];
        $prevLog = null;
        
        foreach ($logs as $log) {
            if ($prevLog) {
                $timeDiff = $prevLog->log_datetime->diffInSeconds($log->log_datetime);
                
                // If less than 2 minutes apart, it's likely a double-tap or misclick
                // Keep the first one, skip the second
                if ($timeDiff < 120) {
                    Log::info('Removed double-tap log', [
                        'first' => $prevLog->log_datetime->format('H:i:s'),
                        'second' => $log->log_datetime->format('H:i:s'),
                        'diff_seconds' => $timeDiff,
                    ]);
                    continue;
                }
            }
            
            $filtered[] = $log;
            $prevLog = $log;
        }
        
        // Now infer types from the filtered logs
        $inferred = [];
        $logCount = count($filtered);
        
        // Lunch boundary: 12:45 PM (765 minutes from midnight)
        $lunchBoundary = 765;
        
        foreach ($filtered as $index => $log) {
            $time = $log->log_datetime;
            $hour = (int) $time->format('H');
            $minute = (int) $time->format('i');
            $totalMinutes = ($hour * 60) + $minute;
            
            // Determine expected type based on position and time
            $inferredType = null;
            
            // Position-based inference (alternating pattern)
            $expectedByPosition = ($index % 2 === 0) ? 'IN' : 'OUT';
            
            // Time-based inference
            if ($index === 0) {
                // First log is almost always IN (morning arrival)
                $inferredType = 'IN';
            }
            elseif ($index === 1 && $logCount === 2) {
                // Special case: Only 2 logs total
                // Second log is almost always OUT (end of day)
                $inferredType = 'OUT';
            }
            elseif ($index === 1 && $logCount === 3) {
                // Special case: 3 logs total (IN-?-OUT pattern)
                // Second log should be OUT (lunch OUT) to avoid losing morning work
                // Pattern: IN (morning) - OUT (lunch) - OUT (afternoon)
                // This will create one pair: IN to first OUT
                $inferredType = 'OUT';
            }
            elseif ($index === 1) {
                // Second log depends on time (4+ logs)
                if ($totalMinutes < $lunchBoundary) {
                    // Before 12:45 = Lunch OUT
                    $inferredType = 'OUT';
                } else {
                    // At/After 12:45 = Lunch IN (employee skipped lunch OUT)
                    $inferredType = 'IN';
                }
            }
            elseif ($index === 2 && $logCount === 3) {
                // Special case: 3 logs total, third log
                // Should be OUT (afternoon departure)
                $inferredType = 'OUT';
            }
            elseif ($index === 2) {
                // Third log depends on time and previous log (4+ logs)
                if ($totalMinutes >= $lunchBoundary && $totalMinutes < 840) {
                    // 12:45 PM - 2:00 PM = Lunch IN
                    $inferredType = 'IN';
                } else {
                    // After 2:00 PM = Afternoon OUT (employee skipped lunch IN)
                    $inferredType = 'OUT';
                }
            }
            elseif ($index === 3) {
                // Fourth log is almost always OUT (end of day)
                $inferredType = 'OUT';
            }
            else {
                // More than 4 logs - use alternating pattern
                $inferredType = $expectedByPosition;
            }
            
            $inferred[] = [
                'datetime' => $time,
                'type' => $inferredType,
                'time' => $time->format('H:i:s'),
                'original_type' => strtoupper($log->log_type),
                'corrected' => (strtoupper($log->log_type) !== $inferredType),
            ];
            
            // Log if we corrected the type
            if (strtoupper($log->log_type) !== $inferredType) {
                Log::info('Inferred log type from time', [
                    'time' => $time->format('H:i:s'),
                    'original_type' => strtoupper($log->log_type),
                    'inferred_type' => $inferredType,
                    'position' => $index + 1,
                    'total_logs' => $logCount,
                    'reason' => 'Time-based inference (employee misclick)'
                ]);
            }
        }
        
        return $inferred;
    }

    /**
     * Assign inferred logs to time slots
     * Similar to assignLogsToTimeSlots but works with inferred types
     */
    private function assignLogsToTimeSlotsFromInferred(array $logs, Carbon $date): array
    {
        $slots = [
            'morning_in' => null,
            'lunch_out' => null,
            'lunch_in' => null,
            'afternoon_out' => null,
        ];

        // Lunch boundary: 12:45 PM (765 minutes from midnight)
        $lunchBoundary = 765;

        foreach ($logs as $log) {
            $time = $log['datetime'];
            $hour = (int) $time->format('H');
            $minute = (int) $time->format('i');
            $totalMinutes = ($hour * 60) + $minute;

            if ($log['type'] === 'IN') {
                // Morning IN: 6:00 AM - 11:59 AM (first IN in this range)
                if ($totalMinutes >= 360 && $totalMinutes < 720 && !$slots['morning_in']) {
                    $slots['morning_in'] = $log['time'];
                }
                // Lunch IN: 12:45 PM onwards (first IN at/after lunch boundary)
                elseif ($totalMinutes >= $lunchBoundary && !$slots['lunch_in']) {
                    $slots['lunch_in'] = $log['time'];
                }
                // If no morning IN was found, use any IN as morning IN
                elseif (!$slots['morning_in']) {
                    $slots['morning_in'] = $log['time'];
                }
            } elseif ($log['type'] === 'OUT') {
                // Lunch OUT: 11:00 AM - 12:44 PM (first OUT before lunch boundary)
                if ($totalMinutes >= 660 && $totalMinutes < $lunchBoundary && !$slots['lunch_out']) {
                    $slots['lunch_out'] = $log['time'];
                }
                // Afternoon OUT: 12:45 PM onwards (last OUT at/after lunch boundary)
                elseif ($totalMinutes >= $lunchBoundary) {
                    $slots['afternoon_out'] = $log['time'];
                }
                // If no lunch OUT was found and time is after 11 AM, use as lunch OUT
                elseif ($totalMinutes >= 660 && !$slots['lunch_out']) {
                    $slots['lunch_out'] = $log['time'];
                }
            }
        }

        return $slots;
    }

    /**
     * STEP 4: Collapse consecutive identical types (keep earliest)
     */
    private function collapseConsecutiveTypes($logs): array
    {
        $collapsed = [];
        $lastType = null;

        foreach ($logs as $log) {
            $currentType = strtoupper($log->log_type);
            
            // Skip if same as previous type (keep earliest)
            if ($currentType === $lastType) {
                continue;
            }

            $collapsed[] = [
                'datetime' => $log->log_datetime,
                'type' => $currentType,
                'time' => $log->log_datetime->format('H:i:s'),
            ];
            
            $lastType = $currentType;
        }

        return $collapsed;
    }

    /**
     * STEP 5 & 6: Pair IN-OUT logs and compute durations
     * Each IN pairs with the next OUT after it
     * Ignore OUT before any IN
     * Ignore IN that never finds an OUT
     */
    private function pairInOutLogs(array $logs): array
    {
        $pairs = [];
        $pendingIn = null;

        foreach ($logs as $log) {
            if ($log['type'] === 'IN') {
                // New IN found, save it as pending
                $pendingIn = $log;
            } elseif ($log['type'] === 'OUT' && $pendingIn !== null) {
                // Found matching OUT for pending IN
                $durationMinutes = $pendingIn['datetime']->diffInMinutes($log['datetime']);
                
                // Ignore negative or zero durations
                if ($durationMinutes > 0) {
                    $pairs[] = [
                        'in_time' => $pendingIn['time'],
                        'out_time' => $log['time'],
                        'in_datetime' => $pendingIn['datetime'],
                        'out_datetime' => $log['datetime'],
                        'duration_minutes' => $durationMinutes,
                    ];
                }
                
                // Clear pending IN
                $pendingIn = null;
            }
            // Ignore OUT before any IN (pendingIn === null)
        }

        return $pairs;
    }

    /**
     * Calculate lunch gap between pairs
     */

    /**
     * STEP 5: Determine attendance status (can be multiple statuses combined)
     */
    private function determineAttendanceStatus(
        array $pairs,
        ?string $firstIn,
        ?string $lastOut,
        float $totalWorkedHours,
        WorkSchedule $schedule,
        bool $hasMissingLogs,
        bool $isLateAM,
        bool $isLatePM,
        bool $isWorkingDay,
        $holiday = null,
        $override = null,
        array $timeSlots = []
    ): string {
        $statuses = [];

        // If it's not a working day (no work expected), handle specially
        if (!$isWorkingDay) {
            if ($override && $override->override_type === 'no_work') {
                // No work expected (typhoon, etc.)
                if (empty($pairs) || $firstIn === null) {
                    return 'Absent - Excused'; // No deduction
                } else {
                    return 'Present - Special Circumstances'; // Heroic effort
                }
            }
            
            // Working on non-working day without authorization (e.g., Sunday without override)
            // Don't check for late/missed logs - just mark as present or absent
            if (empty($pairs) || $firstIn === null) {
                return 'Absent';
            } else {
                return 'Present - Unauthorized Work Day';
            }
        }

        // If it's a holiday
        if ($holiday) {
            if (empty($pairs) || $firstIn === null) {
                return $holiday->is_paid ? 'Absent - Holiday Pay' : 'Absent - Holiday';
            } else {
                return 'Present - Holiday';
            }
        }

        // If it's Sunday work
        if ($override && $override->override_type === 'sunday_work') {
            if (empty($pairs) || $firstIn === null) {
                return 'Absent';
            } else {
                return 'Present - Sunday Work';
            }
        }

        // Regular working day logic
        // Check if person is ABSENT first (no complete IN-OUT pair or no IN log)
        $isAbsent = empty($pairs) || $firstIn === null;

        // If absent, return "Absent" only - don't check for late/undertime
        if ($isAbsent) {
            return 'Absent';
        }

        // Person is PRESENT (has at least one complete pair or has IN log)
        // Now check for other issues

        // Priority 1: MISSED LOG - if any log is missing
        if ($hasMissingLogs) {
            $statuses[] = 'Missed Log';
        }

        // Priority 2: HALF DAY - Based on time slot presence, not hours
        // Half Day = Only morning OR only afternoon present, not both
        $hasMorningPresence = !empty($timeSlots['morning_in']);
        $hasAfternoonPresence = !empty($timeSlots['afternoon_out']);
        
        // Half day if only one period is present (not both, not neither)
        $isHalfDay = ($hasMorningPresence && !$hasAfternoonPresence) || 
                     (!$hasMorningPresence && $hasAfternoonPresence);
        
        if ($isHalfDay) {
            $statuses[] = 'Half Day';
        }

        // Priority 3: LATE - Check both AM and PM (only if not absent)
        if ($isLateAM || $isLatePM) {
            $statuses[] = 'Late';
        }

        // Priority 4: UNDERTIME (only if not absent)
        $isUndertime = $this->isUndertime($lastOut, $schedule);
        if ($isUndertime) {
            $statuses[] = 'Undertime';
        }

        // If no issues, mark as PRESENT
        if (empty($statuses)) {
            return 'Present';
        }

        // Return combined status
        return implode(', ', $statuses);
    }

    /**
     * Calculate workday rendered based on status
     * 1.0 = full day present
     * 0.5 = half day
     * 0.0 = absent
     */
    private function calculateWorkdayRendered(string $status, float $totalWorkedHours, WorkSchedule $schedule): float
    {
        $statusLower = strtolower($status);
        
        // Split status into individual statuses
        $statusParts = array_map('trim', explode(',', $statusLower));
        
        // Check if "absent" is one of the statuses (not just a substring)
        $isAbsent = in_array('absent', $statusParts);
        
        // Check if "half day" is one of the statuses
        $isHalfDay = in_array('half day', $statusParts);
        
        // If status is "Absent" (standalone), return 0
        if ($isAbsent) {
            return 0.0;
        }
        
        // If status contains "Half Day", return 0.5
        if ($isHalfDay) {
            return 0.5;
        }
        
        // For any other status (Present, Late, Missed Log, Undertime, etc.), return 1.0
        // These indicate the employee was present and working
        return 1.0;
    }

    /**
     * Check if employee is late
     */
    private function isLate(?string $firstIn, WorkSchedule $schedule): bool
    {
        if (!$firstIn) return false;

        // Parse times with today's date for proper comparison
        $today = Carbon::today();
        $startTime = Carbon::parse($today->format('Y-m-d') . ' ' . $schedule->work_start_time);
        $graceTime = $startTime->copy()->addMinutes(self::GRACE_PERIOD_MINUTES);
        $actualIn = Carbon::parse($today->format('Y-m-d') . ' ' . $firstIn);

        return $actualIn->gt($graceTime);
    }

    /**
     * Calculate late minutes
     */
    /**
     * Calculate late minutes (from scheduled time, no grace period for payroll)
     */
    private function calculateLateMinutes(?string $firstIn, WorkSchedule $schedule): int
    {
        if (!$firstIn) return 0;

        // Parse times with today's date for proper comparison
        $today = Carbon::today();
        $startTime = Carbon::parse($today->format('Y-m-d') . ' ' . $schedule->work_start_time);
        $graceTime = $startTime->copy()->addMinutes(self::GRACE_PERIOD_MINUTES);
        $actualIn = Carbon::parse($today->format('Y-m-d') . ' ' . $firstIn);

        // Employee is late if arrival is after grace time
        // Late minutes are calculated from scheduled start time (not grace time)
        if ($actualIn->gt($graceTime)) {
            return $startTime->diffInMinutes($actualIn);
        }

        return 0;
    }

    /**
     * Check if employee is late in the afternoon (PM)
     */
    private function isLatePM(?string $pmIn, WorkSchedule $schedule): bool
    {
        if (!$pmIn) return false;

        // Parse times with today's date for proper comparison
        $today = Carbon::today();
        $breakEnd = Carbon::parse($today->format('Y-m-d') . ' ' . $schedule->break_end_time);
        $lateThreshold = $breakEnd->copy()->addMinute(); // Late if more than 1 minute after break_end_time
        $actualIn = Carbon::parse($today->format('Y-m-d') . ' ' . $pmIn);

        return $actualIn->gt($lateThreshold);
    }

    /**
     * Calculate afternoon late minutes
     */
    private function calculateLatePM(?string $pmIn, WorkSchedule $schedule): int
    {
        if (!$pmIn) return 0;

        // Parse times with today's date for proper comparison
        $today = Carbon::today();
        $breakEnd = Carbon::parse($today->format('Y-m-d') . ' ' . $schedule->break_end_time);
        $actualIn = Carbon::parse($today->format('Y-m-d') . ' ' . $pmIn);

        // Employee is late in PM if arrival is more than 1 minute after break_end_time
        $lateThreshold = $breakEnd->copy()->addMinute();
        if ($actualIn->gt($lateThreshold)) {
            return $breakEnd->diffInMinutes($actualIn);
        }

        return 0;
    }

    /**
     * Check if employee has undertime
     */
    private function isUndertime(?string $lastOut, WorkSchedule $schedule): bool
    {
        if (!$lastOut) return false;

        // Parse times with today's date for proper comparison
        $today = Carbon::today();
        $endTime = Carbon::parse($today->format('Y-m-d') . ' ' . $schedule->work_end_time);
        $allowedEarlyOut = $endTime->copy()->subMinutes(self::EARLY_OUT_ALLOWANCE_MINUTES);
        $actualOut = Carbon::parse($today->format('Y-m-d') . ' ' . $lastOut);

        return $actualOut->lt($allowedEarlyOut);
    }

    /**
     * Calculate undertime minutes
     */
    private function calculateUndertimeMinutes(?string $lastOut, WorkSchedule $schedule): int
    {
        if (!$lastOut) return 0;

        // Parse times with today's date for proper comparison
        $today = Carbon::today();
        $endTime = Carbon::parse($today->format('Y-m-d') . ' ' . $schedule->work_end_time);
        $allowedEarlyOut = $endTime->copy()->subMinutes(self::EARLY_OUT_ALLOWANCE_MINUTES);
        $actualOut = Carbon::parse($today->format('Y-m-d') . ' ' . $lastOut);

        // Employee has undertime if they left before allowed early out time
        if ($actualOut->lt($allowedEarlyOut)) {
            // Calculate undertime from scheduled end time (not from allowed early out)
            return $endTime->diffInMinutes($actualOut);
        }

        return 0;
    }

    /**
     * Calculate overtime minutes (only if 1+ hour after work_end_time)
     * The 1 hour is the threshold to qualify for OT, but OT is calculated from work_end_time
     */
    private function calculateOvertimeMinutes(?string $lastOut, WorkSchedule $schedule): int
    {
        if (!$lastOut) return 0;

        // Parse times with today's date for proper comparison
        $today = Carbon::today();
        $endTime = Carbon::parse($today->format('Y-m-d') . ' ' . $schedule->work_end_time);
        $overtimeThreshold = $endTime->copy()->addHour(); // Must be at least 1 hour after to qualify
        $actualOut = Carbon::parse($today->format('Y-m-d') . ' ' . $lastOut);

        // Only count as overtime if out time is at least 1 hour after work_end_time
        if ($actualOut->gt($overtimeThreshold)) {
            // Calculate overtime from work_end_time (includes the 1 hour threshold)
            return $endTime->diffInMinutes($actualOut);
        }

        return 0;
    }

    /**
     * Check if logs are incomplete
     */
    private function hasIncompleteLogs(array $logs): bool
    {
        if (empty($logs)) return true;

        // Check if there's an unpaired IN (last log is IN)
        $lastLog = end($logs);
        return $lastLog['type'] === 'IN';
    }

    /**
     * Count missed logs (empty time slots when employee was present)
     * Returns 0-4 based on how many time slots are missing
     * 
     * Standard pattern: morning_in, lunch_out, lunch_in, afternoon_out (4 logs)
     * Simply count how many of the expected logs are missing
     * 
     * Rules:
     * - If no pairs at all (completely absent), don't count as missed logs
     * - If only morning logs exist (half-day absent afternoon), only count missing morning slots
     * - If only afternoon logs exist (half-day absent morning), only count missing afternoon slots
     * - Otherwise, count all missing slots from the standard 4-log pattern
     */
    private function countMissedLogs(array $timeSlots, array $pairs, WorkSchedule $schedule): int
    {
        // If no pairs at all (completely absent), don't count as missed logs
        if (empty($pairs)) {
            return 0; // Absent, not "missed logs"
        }

        // Determine which periods the employee was present
        $hasMorningLogs = !empty($timeSlots['morning_in']) || !empty($timeSlots['lunch_out']);
        $hasAfternoonLogs = !empty($timeSlots['lunch_in']) || !empty($timeSlots['afternoon_out']);

        // If only afternoon logs exist (half-day absent morning), don't count morning slots
        if ($hasAfternoonLogs && !$hasMorningLogs) {
            // Only count missing afternoon slots
            $missedCount = 0;
            if (empty($timeSlots['lunch_in'])) $missedCount++;
            if (empty($timeSlots['afternoon_out'])) $missedCount++;
            return $missedCount;
        }

        // If only morning logs exist (half-day absent afternoon), don't count afternoon slots
        if ($hasMorningLogs && !$hasAfternoonLogs) {
            // Only count missing morning slots
            $missedCount = 0;
            if (empty($timeSlots['morning_in'])) $missedCount++;
            if (empty($timeSlots['lunch_out'])) $missedCount++;
            return $missedCount;
        }

        // Employee was present for full day - count all missing slots
        $missedCount = 0;
        if (empty($timeSlots['morning_in'])) $missedCount++;
        if (empty($timeSlots['lunch_out'])) $missedCount++;
        if (empty($timeSlots['lunch_in'])) $missedCount++;
        if (empty($timeSlots['afternoon_out'])) $missedCount++;

        return $missedCount;
    }

    /**
     * Generate remarks based on status and flags
     */
    private function generateRemarks(string $status, bool $hasDuplicates, bool $hasIncompleteLogs, bool $lunchDeducted, int $pairCount, $holiday = null, $override = null): ?string
    {
        $remarks = [];

        // Add holiday/override information
        if ($holiday) {
            $remarks[] = "Holiday: {$holiday->name} ({$holiday->type})";
        }

        if ($override) {
            $overrideTypeLabel = match($override->override_type) {
                'no_work' => 'No Work Expected',
                'special_schedule' => 'Special Schedule',
                'sunday_work' => 'Sunday Work',
                'half_day' => 'Half Day',
                default => $override->override_type,
            };
            $remarks[] = "{$overrideTypeLabel}: {$override->reason}";
        }

        if ($hasDuplicates) {
            $remarks[] = 'Duplicate logs detected';
        }

        if ($hasIncompleteLogs) {
            $remarks[] = 'Incomplete logs';
        }
        
        if ($lunchDeducted && $pairCount === 1) {
            $remarks[] = 'Lunch break auto-deducted (missing lunch logs)';
        }

        if ($status === 'Absent' && !$holiday && !$override) {
            $remarks[] = 'No valid IN log';
        }

        return !empty($remarks) ? implode('; ', $remarks) : null;
    }

    /**
     * Get override for a specific employee
     * Priority: Employee-specific override > Department-wide override > No override
     * 
     * This ensures that when an override is created for specific employees,
     * only those employees are affected, not the entire department.
     */
    private function getOverrideForEmployee(Employee $employee, Carbon $date): ?\App\Models\ScheduleOverride
    {
        // First, check if there's an employee-specific override (many-to-many relationship)
        $employeeOverride = \App\Models\ScheduleOverride::where('override_date', $date)
            ->where('department_id', $employee->department_id)
            ->whereHas('employees', function($query) use ($employee) {
                $query->where('employees.id', $employee->id);
            })
            ->first();
        
        if ($employeeOverride) {
            return $employeeOverride;
        }
        
        // Second, check if there's a single employee override (employee_id field)
        $singleEmployeeOverride = \App\Models\ScheduleOverride::where('override_date', $date)
            ->where('department_id', $employee->department_id)
            ->where('employee_id', $employee->id)
            ->first();
        
        if ($singleEmployeeOverride) {
            return $singleEmployeeOverride;
        }
        
        // Third, check if there's a department-wide override (no specific employees)
        // Only return department-wide override if it doesn't have any employee restrictions
        $departmentOverride = \App\Models\ScheduleOverride::where('override_date', $date)
            ->where('department_id', $employee->department_id)
            ->whereNull('employee_id')
            ->whereDoesntHave('employees') // No employees in many-to-many relationship
            ->first();
        
        return $departmentOverride;
    }

    /**
     * Get schedule for employee based on department, holiday, or override
     */
    private function getScheduleForEmployee(Employee $employee, Carbon $date = null, $holiday = null, $override = null): WorkSchedule
    {
        // If there's an override with custom opening/closing times, create a temporary schedule
        if ($override && $override->opening_time && $override->closing_time) {
            // Get the base schedule
            $baseSchedule = $employee->department && $employee->department->workSchedule
                ? $employee->department->workSchedule
                : WorkSchedule::where('department_id', $employee->department_id)->first();
            
            if (!$baseSchedule) {
                // Create default if not found
                $baseSchedule = new WorkSchedule([
                    'work_start_time' => '08:00:00',
                    'work_end_time' => '17:00:00',
                    'break_start_time' => '12:00:00',
                    'break_end_time' => '13:00:00',
                    'grace_period_minutes' => 16,
                    'is_working_day' => true,
                    'half_day_hours' => 4,
                ]);
            }
            
            // Create a temporary schedule with override times
            $tempSchedule = new WorkSchedule([
                'department_id' => $employee->department_id,
                'work_start_time' => $override->opening_time,
                'work_end_time' => $override->closing_time,
                'break_start_time' => $baseSchedule->break_start_time,
                'break_end_time' => $baseSchedule->break_end_time,
                'grace_period_minutes' => $baseSchedule->grace_period_minutes ?? 15,
                'is_working_day' => true,
                'half_day_hours' => $baseSchedule->half_day_hours ?? 4,
            ]);
            
            // Set the ID so it can be referenced
            $tempSchedule->id = $baseSchedule->id ?? 0;
            
            return $tempSchedule;
        }
        
        // If there's an override with a custom schedule_id, use it
        if ($override && $override->schedule_id) {
            return WorkSchedule::find($override->schedule_id);
        }

        // If it's a holiday with a custom schedule, you could add that logic here
        // For now, holidays use the regular department schedule

        // Use the department's work schedule (new normalized structure)
        if ($employee->department && $employee->department->workSchedule) {
            return $employee->department->workSchedule;
        }

        // Fallback: find or create a default schedule
        $schedule = WorkSchedule::where('department_id', $employee->department_id)->first();

        if (!$schedule) {
            // Create default schedule if not found
            $schedule = WorkSchedule::firstOrCreate(
                ['department_id' => $employee->department_id],
                [
                    'work_start_time' => '08:00:00',
                    'work_end_time' => '17:00:00',
                    'break_start_time' => '12:00:00',
                    'break_end_time' => '13:00:00',
                    'grace_period_minutes' => 15,
                    'is_working_day' => true,
                    'half_day_hours' => 4,
                ]
            );
        }

        return $schedule;
    }

    /**
     * Determine if this is a working day FOR THIS SPECIFIC EMPLOYEE
     * 
     * IMPORTANT: If there's an employee-specific override, only that employee
     * should have it as a working day. Other employees should NOT.
     */
    private function isWorkingDay(Carbon $date, WorkSchedule $schedule, $holiday = null, $override = null): bool
    {
        // If there's an override that says "no work expected", it's not a working day
        if ($override && $override->override_type === 'no_work') {
            return false;
        }

        // If it's a holiday, it's NOT a working day (company policy: no work no pay)
        // Employees who come in on holidays get overtime but are not "expected" to work
        if ($holiday) {
            return false;
        }

        // Check if it's Saturday (day of week = 6)
        if ($date->dayOfWeek === 6) {
            // Saturday is only a working day if there's an override authorizing it
            // Use 'special_schedule' or 'sunday_work' (reused for Saturday)
            // IMPORTANT: Override must apply to THIS employee (not just exist for department)
            return $override && in_array($override->override_type, ['special_schedule', 'sunday_work']);
        }

        // Check if it's Sunday (day of week = 0)
        if ($date->dayOfWeek === 0) {
            // Sunday is only a working day if there's an override authorizing it
            // Use 'special_schedule' or 'sunday_work'
            // IMPORTANT: Override must apply to THIS employee (not just exist for department)
            return $override && in_array($override->override_type, ['special_schedule', 'sunday_work']);
        }

        // Otherwise, use the schedule's is_working_day flag
        return $schedule->is_working_day;
    }

    /**
     * Get attendance logs with filters
     */
    public function getAttendanceLogs(array $filters = [])
    {
        $query = AttendanceLog::with('employee');

        if (isset($filters['start_date'])) {
            $query->whereDate('log_datetime', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->whereDate('log_datetime', '<=', $filters['end_date']);
        }

        if (isset($filters['employee_code'])) {
            $query->where('employee_code', $filters['employee_code']);
        }

        return $query->orderBy('log_datetime', 'desc')->paginate($filters['per_page'] ?? 50);
    }

    /**
     * Get attendance records with filters
     */
    public function getAttendanceRecords(array $filters = [])
    {
        $query = AttendanceRecord::with(['employee', 'schedule']);

        if (isset($filters['start_date'])) {
            $query->whereDate('attendance_date', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->whereDate('attendance_date', '<=', $filters['end_date']);
        }

        if (isset($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        if (isset($filters['missed_logs_count']) && $filters['missed_logs_count']) {
            $query->where('missed_logs_count', '>', 0);
        }

        return $query->orderBy('attendance_date', 'desc')->paginate($filters['per_page'] ?? 50);
    }

    /**
     * Get date range from recently uploaded logs
     */
    public function getUploadedLogsDateRange(): array
    {
        // Get the date range from all logs
        $minDate = AttendanceLog::selectRaw('DATE(log_datetime) as date')
            ->orderBy('log_datetime', 'asc')
            ->first();
        
        $maxDate = AttendanceLog::selectRaw('DATE(log_datetime) as date')
            ->orderBy('log_datetime', 'desc')
            ->first();

        if (!$minDate || !$maxDate) {
            return ['start' => null, 'end' => null];
        }

        return [
            'start' => $minDate->date,
            'end' => $maxDate->date,
        ];
    }

    /**
     * Get date range from a specific uploaded CSV file
     * This is more efficient than processing all logs
     */
    public function getNewlyUploadedLogsDateRange(string $sourceFile): array
    {
        // Get the date range from logs in this specific CSV file
        $minDate = AttendanceLog::where('source_file', $sourceFile)
            ->selectRaw('DATE(log_datetime) as date')
            ->orderBy('log_datetime', 'asc')
            ->first();
        
        $maxDate = AttendanceLog::where('source_file', $sourceFile)
            ->selectRaw('DATE(log_datetime) as date')
            ->orderBy('log_datetime', 'desc')
            ->first();

        if (!$minDate || !$maxDate) {
            return ['start' => null, 'end' => null];
        }

        return [
            'start' => $minDate->date,
            'end' => $maxDate->date,
        ];
    }

    /**
     * Get date range from attendance records
     */
    public function getAttendanceRecordsDateRange(): array
    {
        $minDate = AttendanceRecord::orderBy('attendance_date', 'asc')->first();
        $maxDate = AttendanceRecord::orderBy('attendance_date', 'desc')->first();

        if (!$minDate || !$maxDate) {
            return [
                'start' => null,
                'end' => null,
                'total_days' => 0,
            ];
        }

        $start = $minDate->attendance_date;
        $end = $maxDate->attendance_date;
        $totalDays = $start->diffInDays($end) + 1;

        return [
            'start' => $start->format('Y-m-d'),
            'end' => $end->format('Y-m-d'),
            'start_formatted' => $start->format('M d, Y'),
            'end_formatted' => $end->format('M d, Y'),
            'total_days' => $totalDays,
        ];
    }

    /**
     * Detect date gaps in attendance records
     * Returns array of gap information
     */
    public function detectDateGaps(): array
    {
        // Get all distinct dates from attendance_records, ordered
        $dates = AttendanceRecord::selectRaw('DISTINCT attendance_date')
            ->orderBy('attendance_date', 'asc')
            ->pluck('attendance_date')
            ->map(fn($date) => Carbon::parse($date));

        if ($dates->count() < 2) {
            return [
                'has_gaps' => false,
                'gaps' => [],
                'continuous_ranges' => [],
            ];
        }

        $gaps = [];
        $continuousRanges = [];
        $rangeStart = $dates->first();
        $prevDate = $dates->first();

        foreach ($dates->skip(1) as $currentDate) {
            $daysDiff = $prevDate->diffInDays($currentDate);

            // If gap detected (more than 1 day difference)
            if ($daysDiff > 1) {
                // Save the continuous range that just ended
                $continuousRanges[] = [
                    'start' => $rangeStart->format('Y-m-d'),
                    'end' => $prevDate->format('Y-m-d'),
                    'start_formatted' => $rangeStart->format('M d, Y'),
                    'end_formatted' => $prevDate->format('M d, Y'),
                ];

                // Record the gap
                $gapStart = $prevDate->copy()->addDay();
                $gapEnd = $currentDate->copy()->subDay();
                
                $gaps[] = [
                    'start' => $gapStart->format('Y-m-d'),
                    'end' => $gapEnd->format('Y-m-d'),
                    'start_formatted' => $gapStart->format('M d, Y'),
                    'end_formatted' => $gapEnd->format('M d, Y'),
                    'days' => $gapStart->diffInDays($gapEnd) + 1,
                ];

                // Start new continuous range
                $rangeStart = $currentDate;
            }

            $prevDate = $currentDate;
        }

        // Add the last continuous range
        $continuousRanges[] = [
            'start' => $rangeStart->format('Y-m-d'),
            'end' => $prevDate->format('Y-m-d'),
            'start_formatted' => $rangeStart->format('M d, Y'),
            'end_formatted' => $prevDate->format('M d, Y'),
        ];

        return [
            'has_gaps' => count($gaps) > 0,
            'gaps' => $gaps,
            'continuous_ranges' => $continuousRanges,
        ];
    }

    /**
     * Validate if a date range contains gaps
     * Returns validation result
     */
    public function validateDateRange(string $startDate, string $endDate): array
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        // Get all dates in the requested range
        $requestedDates = [];
        $current = $start->copy();
        while ($current->lte($end)) {
            $requestedDates[] = $current->format('Y-m-d');
            $current->addDay();
        }

        // Get all dates that exist in attendance_records within this range
        $existingDates = AttendanceRecord::whereBetween('attendance_date', [$startDate, $endDate])
            ->selectRaw('DISTINCT attendance_date')
            ->orderBy('attendance_date')
            ->pluck('attendance_date')
            ->map(fn($date) => Carbon::parse($date)->format('Y-m-d'))
            ->toArray();

        // Find missing dates (excluding weekends)
        $missingDates = [];
        foreach ($requestedDates as $date) {
            $carbonDate = Carbon::parse($date);
            
            // Skip weekends (Saturday = 6, Sunday = 0)
            if ($carbonDate->dayOfWeek === 0 || $carbonDate->dayOfWeek === 6) {
                continue;
            }

            if (!in_array($date, $existingDates)) {
                $missingDates[] = $date;
            }
        }

        // Group consecutive missing dates into gap ranges
        $gapRanges = [];
        if (count($missingDates) > 0) {
            $gapStart = $missingDates[0];
            $gapEnd = $missingDates[0];

            for ($i = 1; $i < count($missingDates); $i++) {
                $prevDate = Carbon::parse($missingDates[$i - 1]);
                $currentDate = Carbon::parse($missingDates[$i]);

                // Check if consecutive (accounting for weekends)
                $daysDiff = $prevDate->diffInDays($currentDate);
                
                if ($daysDiff <= 3) { // Allow up to 3 days (includes weekends)
                    $gapEnd = $missingDates[$i];
                } else {
                    // Save current gap range
                    $gapRanges[] = [
                        'start' => $gapStart,
                        'end' => $gapEnd,
                        'start_formatted' => Carbon::parse($gapStart)->format('M d, Y'),
                        'end_formatted' => Carbon::parse($gapEnd)->format('M d, Y'),
                    ];
                    
                    // Start new gap range
                    $gapStart = $missingDates[$i];
                    $gapEnd = $missingDates[$i];
                }
            }

            // Add the last gap range
            $gapRanges[] = [
                'start' => $gapStart,
                'end' => $gapEnd,
                'start_formatted' => Carbon::parse($gapStart)->format('M d, Y'),
                'end_formatted' => Carbon::parse($gapEnd)->format('M d, Y'),
            ];
        }

        return [
            'valid' => count($missingDates) === 0,
            'has_gaps' => count($missingDates) > 0,
            'missing_dates' => $missingDates,
            'gap_ranges' => $gapRanges,
        ];
    }

    /**
     * Get attendance summary grouped by employee
     */
    public function getAttendanceSummary(): array
    {
        $records = AttendanceRecord::with(['employee.department'])
            ->get()
            ->groupBy('employee_id');

        $summary = [];

        foreach ($records as $employeeId => $employeeRecords) {
            $employee = $employeeRecords->first()->employee;
            
            if (!$employee) {
                continue;
            }

            $totalWorkdays = $employeeRecords->sum('rendered');
            
            // Count absences (whole day only)
            $totalAbsences = $employeeRecords->where('status', 'Absent')->count();
            
            // Count half-day absences
            $halfDayCount = $employeeRecords->where('status', 'Half Day')->count();
            
            // Total absences in days (half-day = 0.5)
            $totalAbsenceDays = $totalAbsences + ($halfDayCount * 0.5);
            
            $totalLateMinutes = $employeeRecords->sum('total_late_minutes');
            $totalOvertimeMinutes = $employeeRecords->sum('overtime_minutes');
            
            // Count days with missed logs (excluding absences)
            $totalMissedLogs = $employeeRecords
                ->where('missed_logs_count', '>', 0)
                ->filter(fn($r) => $r->status !== 'Absent')
                ->count();
            
            // Calculate undertime
            $totalUndertimeMinutes = $employeeRecords->sum('undertime_minutes');
            
            // Count late frequency (days with late > 0)
            $lateFrequency = $employeeRecords->filter(fn($r) => $r->total_late_minutes > 0)->count();

            $summary[] = [
                'employee_id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'employee_name' => $employee->last_name . ', ' . $employee->first_name,
                'department' => $employee->department->name ?? 'N/A',
                'total_workdays' => round($totalWorkdays, 2),
                'total_absences' => $totalAbsenceDays,
                'total_late_minutes' => $totalLateMinutes,
                'total_undertime_minutes' => $totalUndertimeMinutes,
                'total_overtime_minutes' => $totalOvertimeMinutes,
                'total_missed_logs' => $totalMissedLogs,
                'late_frequency' => $lateFrequency,
                'records' => $employeeRecords->map(function ($record) {
                    return [
                        'id' => $record->id,
                        'attendance_date' => $record->attendance_date->format('Y-m-d'),
                        'time_in_am' => $record->time_in_am,
                        'time_out_lunch' => $record->time_out_lunch,
                        'time_in_pm' => $record->time_in_pm,
                        'time_out_pm' => $record->time_out_pm,
                        'late_minutes_am' => $record->late_minutes_am,
                        'late_minutes_pm' => $record->late_minutes_pm,
                        'total_late_minutes' => $record->total_late_minutes,
                        'undertime_minutes' => $record->undertime_minutes,
                        'overtime_minutes' => $record->overtime_minutes,
                        'rendered' => $record->rendered,
                        'status' => $record->status ?? 'Unknown',
                        'missed_logs_count' => $record->missed_logs_count,
                    ];
                })->values()->toArray(),
            ];
        }

        // Sort by employee name
        usort($summary, function ($a, $b) {
            return strcmp($a['employee_name'], $b['employee_name']);
        });

        return $summary;
    }

    /**
     * Detect and log violations for an employee on a specific date
     * TEMPORARILY DISABLED: AttendanceViolation model not yet ready
     */
    /*
    private function detectViolations(
        Employee $employee,
        Carbon $date,
        $logs,
        $uniqueLogs,
        $timeSlots,
        $schedule,
        $lateMinutesAM,
        $lateMinutesPM,
        $undertimeMinutes,
        $missedLogsCount
    ): void {
        $violations = [];

        // 1. Multiple Logs Violation (more than 4 logs OR duplicates in same slot)
        if (count($logs) > 4 || count($logs) !== count($uniqueLogs)) {
            $violations[] = [
                'violation_type' => 'Multiple Logs',
                'details' => count($logs) . ' logs detected (expected: 4)',
                'severity' => 'Low',
                'metadata' => ['log_count' => count($logs), 'expected' => 4],
            ];
        }

        // 2. Missing Log Violation
        if ($missedLogsCount > 0) {
            $missingSlots = [];
            if (!$timeSlots['morning_in']) $missingSlots[] = 'Morning IN';
            if (!$timeSlots['lunch_out']) $missingSlots[] = 'Lunch OUT';
            if (!$timeSlots['lunch_in']) $missingSlots[] = 'Lunch IN';
            if (!$timeSlots['afternoon_out']) $missingSlots[] = 'Afternoon OUT';
            
            $violations[] = [
                'violation_type' => 'Missing Log',
                'details' => 'Missing: ' . implode(', ', $missingSlots),
                'severity' => 'High',
                'metadata' => ['missing_slots' => $missingSlots],
            ];
        }

        // 3. Early Lunch OUT Violation (before 11:55 AM)
        if ($timeSlots['lunch_out']) {
            $lunchOutTime = Carbon::parse($date->format('Y-m-d') . ' ' . $timeSlots['lunch_out']);
            $earlyLimit = Carbon::parse($date->format('Y-m-d') . ' 11:55:00');
            
            if ($lunchOutTime->lt($earlyLimit)) {
                $minutesEarly = $earlyLimit->diffInMinutes($lunchOutTime);
                $violations[] = [
                    'violation_type' => 'Early Lunch OUT',
                    'details' => 'Clocked out at ' . $lunchOutTime->format('h:i A') . ' (limit: 11:55 AM)',
                    'severity' => 'Medium',
                    'metadata' => ['time' => $lunchOutTime->format('H:i:s'), 'minutes_early' => $minutesEarly],
                ];
            }
        }

        // 4. Late Lunch OUT Violation (after 12:15 PM)
        if ($timeSlots['lunch_out']) {
            $lunchOutTime = Carbon::parse($date->format('Y-m-d') . ' ' . $timeSlots['lunch_out']);
            $lateLimit = Carbon::parse($date->format('Y-m-d') . ' 12:15:00');
            
            if ($lunchOutTime->gt($lateLimit)) {
                $minutesLate = $lunchOutTime->diffInMinutes($lateLimit);
                $violations[] = [
                    'violation_type' => 'Late Lunch OUT',
                    'details' => 'Clocked out at ' . $lunchOutTime->format('h:i A') . ' (limit: 12:15 PM)',
                    'severity' => 'Medium',
                    'metadata' => ['time' => $lunchOutTime->format('H:i:s'), 'minutes_late' => $minutesLate],
                ];
            }
        }

        // 5. Early Lunch IN Violation (before 12:55 PM)
        if ($timeSlots['lunch_in']) {
            $lunchInTime = Carbon::parse($date->format('Y-m-d') . ' ' . $timeSlots['lunch_in']);
            $earlyLimit = Carbon::parse($date->format('Y-m-d') . ' 12:55:00');
            
            if ($lunchInTime->lt($earlyLimit)) {
                $minutesEarly = $earlyLimit->diffInMinutes($lunchInTime);
                $violations[] = [
                    'violation_type' => 'Early Lunch IN',
                    'details' => 'Clocked in at ' . $lunchInTime->format('h:i A') . ' (minimum: 12:55 PM)',
                    'severity' => 'Low',
                    'metadata' => ['time' => $lunchInTime->format('H:i:s'), 'minutes_early' => $minutesEarly],
                ];
            }
        }

        // 6. Excessive Late Violation (more than 15 minutes late)
        if ($lateMinutesAM + $lateMinutesPM > 15) {
            $violations[] = [
                'violation_type' => 'Excessive Late',
                'details' => 'Arrived ' . ($lateMinutesAM + $lateMinutesPM) . ' minutes late (grace: 15 min)',
                'severity' => 'High',
                'metadata' => ['late_minutes' => $lateMinutesAM + $lateMinutesPM, 'grace_period' => 15],
            ];
        }

        // 7. Excessive Undertime Violation (more than 5 minutes undertime)
        if ($undertimeMinutes > 5) {
            $violations[] = [
                'violation_type' => 'Excessive Undertime',
                'details' => $undertimeMinutes . ' minutes undertime (allowance: 5 min)',
                'severity' => 'Medium',
                'metadata' => ['undertime_minutes' => $undertimeMinutes, 'allowance' => 5],
            ];
        }

        // Save violations to database
        foreach ($violations as $violation) {
            \App\Models\AttendanceViolation::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'violation_date' => $date->format('Y-m-d'),
                    'violation_type' => $violation['violation_type'],
                ],
                [
                    'details' => $violation['details'],
                    'severity' => $violation['severity'],
                    'status' => 'Pending',
                    'metadata' => $violation['metadata'],
                ]
            );
        }
    }
    */
}
