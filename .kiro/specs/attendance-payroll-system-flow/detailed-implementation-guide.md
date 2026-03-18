# Detailed Implementation Guide
## Attendance & Payroll System

---

## 1. Service Layer Implementation Details

### 1.1 AttendanceService Implementation

```php
class AttendanceService
{
    public function __construct(
        private AttendanceLogRepository $logRepo,
        private AttendanceRecordRepository $recordRepo,
        private WorkScheduleRepository $scheduleRepo,
        private ViolationDetectionService $violationService
    ) {}
    
    /**
     * Process logs for a date range
     */
    public function processLogsForDateRange(Carbon $startDate, Carbon $endDate): array
    {
        $results = ['processed' => 0, 'flagged' => 0, 'errors' => []];
        
        $dates = $startDate->daysUntil($endDate);
        
        foreach ($dates as $date) {
            try {
                $this->processDateLogs($date);
                $results['processed']++;
            } catch (Exception $e) {
                $results['errors'][] = [
                    'date' => $date->toDateString(),
                    'error' => $e->getMessage(),
                ];
            }
        }
        
        return $results;
    }
    
    /**
     * Process logs for a single date
     */
    private function processDateLogs(Carbon $date): void
    {
        $employees = Employee::where('status', 'active')->get();
        
        foreach ($employees as $employee) {
            $this->processEmployeeDayLogs($employee, $date);
        }
    }
    
    /**
     * Process logs for employee on specific date
     */
    public function processEmployeeDayLogs(Employee $employee, Carbon $date): AttendanceRecord
    {
        // Fetch raw logs
        $logs = $this->logRepo->getEmployeeDayLogs($employee->id, $date);
        
        // Get work schedule
        $schedule = $employee->schedule ?? $employee->department->workSchedule;
        
        // Check if it's a working day
        if (!$this->isWorkingDay($date, $schedule)) {
            return $this->createNonWorkingDayRecord($employee, $date);
        }
        
        // Filter double-taps
        $logs = $this->filterDoubleTaps($logs);
        
        // Handle rapid re-tap pattern
        $logs = $this->handleRapidRetap($logs);
        
        // Assign logs to time slots
        $assignment = $this->assignLogsToTimeSlots($logs, $schedule);
        
        // Calculate confidence score
        $confidence = $this->calculateConfidenceScore($logs, $assignment);
        
        // Create attendance record
        $record = $this->recordRepo->create([
            'employee_id' => $employee->id,
            'attendance_date' => $date,
            'schedule_id' => $schedule->id,
            'time_in_am' => $assignment['time_in_am'],
            'time_out_lunch' => $assignment['time_out_lunch'],
            'time_in_pm' => $assignment['time_in_pm'],
            'time_out_pm' => $assignment['time_out_pm'],
            'confidence_score' => $confidence,
            'status' => $confidence >= 70 ? 'clean' : 'flagged',
        ]);
        
        // Calculate metrics
        $this->calculateMetrics($record, $schedule);
        
        // Detect violations
        $violations = $this->violationService->detectViolations($record, $logs);
        
        if (!empty($violations)) {
            $record->update(['status' => 'flagged']);
        }
        
        return $record;
    }
    
    /**
     * Filter double-tap logs (within threshold)
     */
    private function filterDoubleTaps(Collection $logs, int $thresholdMinutes = 2): Collection
    {
        $filtered = [];
        $lastLog = null;
        
        foreach ($logs as $log) {
            if ($lastLog === null) {
                $filtered[] = $log;
                $lastLog = $log;
                continue;
            }
            
            $diffMinutes = $log->log_datetime->diffInMinutes($lastLog->log_datetime);
            
            if ($diffMinutes > $thresholdMinutes) {
                $filtered[] = $log;
                $lastLog = $log;
            }
        }
        
        return collect($filtered);
    }
    
    /**
     * Handle rapid re-tap pattern (IN-OUT-IN within 5 min)
     */
    private function handleRapidRetap(Collection $logs): Collection
    {
        if ($logs->count() < 3) {
            return $logs;
        }
        
        $result = [];
        $i = 0;
        
        while ($i < $logs->count()) {
            $current = $logs[$i];
            
            // Check for IN-OUT-IN pattern
            if ($i + 2 < $logs->count()) {
                $next = $logs[$i + 1];
                $nextNext = $logs[$i + 2];
                
                if ($current->log_type === 'IN' && 
                    $next->log_type === 'OUT' && 
                    $nextNext->log_type === 'IN') {
                    
                    $diffMinutes = $nextNext->log_datetime->diffInMinutes($current->log_datetime);
                    
                    if ($diffMinutes <= 5) {
                        // Treat as single IN, skip OUT and next IN
                        $result[] = $current;
                        $i += 3;
                        continue;
                    }
                }
            }
            
            $result[] = $current;
            $i++;
        }
        
        return collect($result);
    }
    
    /**
     * Assign logs to time slots
     */
    private function assignLogsToTimeSlots(Collection $logs, WorkSchedule $schedule): array
    {
        $assignment = [
            'time_in_am' => null,
            'time_out_lunch' => null,
            'time_in_pm' => null,
            'time_out_pm' => null,
        ];
        
        if ($logs->isEmpty()) {
            return $assignment;
        }
        
        $logArray = $logs->toArray();
        
        // 4 logs: Standard day
        if (count($logArray) === 4) {
            $assignment['time_in_am'] = $logArray[0]->log_datetime->format('H:i:s');
            $assignment['time_out_lunch'] = $logArray[1]->log_datetime->format('H:i:s');
            $assignment['time_in_pm'] = $logArray[2]->log_datetime->format('H:i:s');
            $assignment['time_out_pm'] = $logArray[3]->log_datetime->format('H:i:s');
        }
        // 2 logs: Half day or forgot lunch
        elseif (count($logArray) === 2) {
            $assignment['time_in_am'] = $logArray[0]->log_datetime->format('H:i:s');
            $assignment['time_out_pm'] = $logArray[1]->log_datetime->format('H:i:s');
        }
        // 1 log: Forgot logout
        elseif (count($logArray) === 1) {
            $assignment['time_in_am'] = $logArray[0]->log_datetime->format('H:i:s');
            $assignment['time_out_pm'] = $schedule->work_end_time;
        }
        // 3 logs: Misclick or forgot one
        elseif (count($logArray) === 3) {
            $assignment['time_in_am'] = $logArray[0]->log_datetime->format('H:i:s');
            $assignment['time_out_lunch'] = $logArray[1]->log_datetime->format('H:i:s');
            $assignment['time_out_pm'] = $logArray[2]->log_datetime->format('H:i:s');
        }
        // 5+ logs: Extra clicks
        else {
            $assignment['time_in_am'] = $logArray[0]->log_datetime->format('H:i:s');
            $assignment['time_out_pm'] = $logArray[count($logArray) - 1]->log_datetime->format('H:i:s');
        }
        
        return $assignment;
    }
    
    /**
     * Calculate confidence score
     */
    private function calculateConfidenceScore(Collection $logs, array $assignment): int
    {
        $count = $logs->count();
        
        // Base score by log count
        $baseScore = match ($count) {
            4 => 100,
            2 => 80,
            1 => 40,
            3, 5 => 60,
            default => 50,
        };
        
        // Adjust for time spacing regularity
        if ($count >= 2) {
            $intervals = [];
            $logArray = $logs->toArray();
            
            for ($i = 1; $i < count($logArray); $i++) {
                $intervals[] = $logArray[$i]->log_datetime->diffInMinutes($logArray[$i - 1]->log_datetime);
            }
            
            $avgInterval = array_sum($intervals) / count($intervals);
            $variance = array_sum(array_map(fn($x) => pow($x - $avgInterval, 2), $intervals)) / count($intervals);
            
            if ($variance < 100) {
                $baseScore += 5;
            }
        }
        
        return min(100, $baseScore);
    }
    
    /**
     * Calculate attendance metrics
     */
    private function calculateMetrics(AttendanceRecord $record, WorkSchedule $schedule): void
    {
        // Calculate late minutes
        if ($record->time_in_am) {
            $scheduleStart = Carbon::parse($schedule->work_start_time);
            $actualStart = Carbon::parse($record->time_in_am);
            
            $lateMinutes = max(0, $actualStart->diffInMinutes($scheduleStart));
            $graceMinutes = $this->getGracePeriod($schedule);
            
            $record->late_minutes_am = max(0, $lateMinutes - $graceMinutes);
        }
        
        // Calculate undertime
        if ($record->time_out_pm && $record->time_in_am) {
            $expectedHours = 8; // Standard 8-hour day
            $actualHours = $this->calculateWorkedHours($record);
            
            $undertimeHours = max(0, $expectedHours - $actualHours);
            $record->undertime_minutes = (int)($undertimeHours * 60);
        }
        
        // Calculate overtime
        if ($record->time_out_pm && $record->time_in_am) {
            $expectedHours = 8;
            $actualHours = $this->calculateWorkedHours($record);
            
            $overtimeHours = max(0, $actualHours - $expectedHours);
            $record->overtime_minutes = (int)($overtimeHours * 60);
        }
        
        // Calculate rendered
        $record->rendered = $this->calculateRendered($record);
        
        $record->save();
    }
    
    /**
     * Calculate worked hours
     */
    private function calculateWorkedHours(AttendanceRecord $record): float
    {
        $amHours = 0;
        $pmHours = 0;
        
        if ($record->time_in_am && $record->time_out_lunch) {
            $amHours = Carbon::parse($record->time_out_lunch)
                ->diffInMinutes(Carbon::parse($record->time_in_am)) / 60;
        }
        
        if ($record->time_in_pm && $record->time_out_pm) {
            $pmHours = Carbon::parse($record->time_out_pm)
                ->diffInMinutes(Carbon::parse($record->time_in_pm)) / 60;
        }
        
        return $amHours + $pmHours;
    }
    
    /**
     * Calculate rendered (0.0 to 1.0)
     */
    private function calculateRendered(AttendanceRecord $record): float
    {
        if (!$record->time_in_am) {
            return 0.0; // Absent
        }
        
        $workedHours = $this->calculateWorkedHours($record);
        
        if ($workedHours >= 8) {
            return 1.0; // Full day
        } elseif ($workedHours >= 4) {
            return 0.5; // Half day
        } else {
            return 0.0; // Absent
        }
    }
    
    /**
     * Get grace period for schedule
     */
    private function getGracePeriod(WorkSchedule $schedule): int
    {
        $settings = DepartmentGracePeriodSettings::where(
            'department_id',
            $schedule->department_id
        )->first();
        
        return $settings?->grace_period_minutes ?? 0;
    }
    
    /**
     * Check if it's a working day
     */
    private function isWorkingDay(Carbon $date, WorkSchedule $schedule): bool
    {
        // Check if it's a holiday
        if (Holiday::where('date', $date->toDateString())->exists()) {
            return false;
        }
        
        // Check if it's a weekend (assuming Mon-Fri is working)
        if ($date->isWeekend()) {
            return false;
        }
        
        // Check schedule overrides
        $override = ScheduleOverride::where('date', $date->toDateString())
            ->where('schedule_id', $schedule->id)
            ->first();
        
        return $override?->is_working_day ?? true;
    }
    
    /**
     * Create non-working day record
     */
    private function createNonWorkingDayRecord(Employee $employee, Carbon $date): AttendanceRecord
    {
        return $this->recordRepo->create([
            'employee_id' => $employee->id,
            'attendance_date' => $date,
            'schedule_id' => $employee->schedule_id,
            'rendered' => 0.0,
            'status' => 'clean',
            'remarks' => 'Non-working day',
        ]);
    }
}
```

### 1.2 PayrollService Implementation

```php
class PayrollService
{
    public function __construct(
        private PayrollRepository $payrollRepo,
        private AttendanceRepository $attendanceRepo,
        private ViolationRepository $violationRepo,
        private CashAdvanceRepository $cashAdvanceRepo,
        private PayslipService $payslipService
    ) {}
    
    /**
     * Generate payroll for all employees in period
     */
    public function generatePayroll(PayrollPeriod $period): array
    {
        $results = ['success' => 0, 'failed' => 0, 'errors' => []];
        
        $employees = Employee::where('department_id', $period->department_id)
            ->where('status', 'active')
            ->chunk(100);
        
        foreach ($employees as $chunk) {
            foreach ($chunk as $employee) {
                try {
                    $this->generateEmployeePayroll($period, $employee);
                    $results['success']++;
                } catch (Exception $e) {
                    $results['failed']++;
                    $results['errors'][] = [
                        'employee_id' => $employee->id,
                        'error' => $e->getMessage(),
                    ];
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Generate payroll for single employee
     */
    public function generateEmployeePayroll(PayrollPeriod $period, Employee $employee): Payroll
    {
        // Fetch or create payroll record
        $payroll = Payroll::firstOrCreate(
            [
                'payroll_period_id' => $period->id,
                'employee_id' => $employee->id,
            ],
            ['status' => 'DRAFT']
        );
        
        // Clear existing items
        $payroll->items()->delete();
        
        // Calculate payroll
        $calculation = $this->calculatePayroll($employee, $period);
        
        // Update payroll record
        $payroll->update([
            'basic_pay' => $calculation['basic_pay'],
            'overtime_pay' => $calculation['overtime_pay'],
            'gross_pay' => $calculation['gross_pay'],
            'total_earnings' => $calculation['total_earnings'],
            'total_deductions' => $calculation['total_deductions'],
            'net_pay' => $calculation['net_pay'],
        ]);
        
        // Create payroll items
        foreach ($calculation['items'] as $item) {
            $payroll->items()->create($item);
        }
        
        return $payroll;
    }
    
    /**
     * Calculate payroll components
     */
    public function calculatePayroll(Employee $employee, PayrollPeriod $period): array
    {
        // Fetch attendance records
        $records = $this->attendanceRepo->getEmployeePeriodRecords(
            $employee->id,
            $period->start_date,
            $period->end_date
        );
        
        // Calculate basic metrics
        $daysWorked = $records->sum('rendered');
        $totalLateMinutes = $records->sum('total_late_minutes');
        $totalOvertimeMinutes = $records->sum('overtime_minutes');
        $totalUndertimeMinutes = $records->sum('undertime_minutes');
        
        // Get daily rate
        $dailyRate = $employee->daily_rate ?? 0;
        $hourlyRate = $dailyRate / 8;
        
        // Calculate earnings
        $basicPay = $daysWorked * $dailyRate;
        $overtimePay = ($totalOvertimeMinutes / 60) * $hourlyRate * 1.25;
        $grossPay = $basicPay + $overtimePay;
        
        // Calculate deductions
        $latePenalty = ($totalLateMinutes / 60) * $hourlyRate;
        $undertimePenalty = ($totalUndertimeMinutes / 60) * $hourlyRate;
        
        // Get contributions
        $contributions = $employee->contributions;
        $contributionAmount = $contributions->sum('amount');
        
        // Get violation deductions
        $violationDeductions = $this->calculateViolationDeductions($employee, $period);
        
        // Get cash advance deductions
        $cashAdvanceDeductions = $this->calculateCashAdvanceDeductions($employee, $period);
        
        // Calculate totals
        $totalDeductions = $latePenalty + $undertimePenalty + $contributionAmount + 
                          $violationDeductions + $cashAdvanceDeductions;
        $netPay = max(0, $grossPay - $totalDeductions);
        
        // Build items array
        $items = [
            ['type' => 'EARNING', 'category' => 'Basic Pay', 'amount' => $basicPay],
            ['type' => 'EARNING', 'category' => 'Overtime', 'amount' => $overtimePay],
            ['type' => 'DEDUCTION', 'category' => 'Late Penalty', 'amount' => $latePenalty],
            ['type' => 'DEDUCTION', 'category' => 'Undertime Penalty', 'amount' => $undertimePenalty],
        ];
        
        // Add contributions
        foreach ($contributions as $contribution) {
            $items[] = [
                'type' => 'DEDUCTION',
                'category' => $contribution->contributionType->name,
                'amount' => $contribution->amount,
            ];
        }
        
        // Add violation deductions
        $items = array_merge($items, $violationDeductions['items']);
        
        // Add cash advance deductions
        $items = array_merge($items, $cashAdvanceDeductions['items']);
        
        return [
            'basic_pay' => $basicPay,
            'overtime_pay' => $overtimePay,
            'gross_pay' => $grossPay,
            'total_earnings' => $basicPay + $overtimePay,
            'total_deductions' => $totalDeductions,
            'net_pay' => $netPay,
            'items' => $items,
        ];
    }
    
    /**
     * Calculate violation deductions
     */
    private function calculateViolationDeductions(Employee $employee, PayrollPeriod $period): array
    {
        $violations = $this->violationRepo->getEmployeePeriodViolations(
            $employee->id,
            $period->start_date,
            $period->end_date
        );
        
        $totalDeduction = 0;
        $items = [];
        $dailyRate = $employee->daily_rate ?? 0;
        $hourlyRate = $dailyRate / 8;
        
        foreach ($violations as $violation) {
            $deduction = 0;
            
            switch ($violation->violation_type) {
                case 'CUMULATIVE_GRACE_PERIOD':
                    $deduction = ($violation->duration_minutes / 60) * $hourlyRate;
                    break;
                case 'UNEXCUSED_ABSENCE':
                    $deduction = $dailyRate;
                    break;
                case 'AWOL':
                    $deduction = $dailyRate * 3;
                    break;
            }
            
            if ($deduction > 0) {
                $totalDeduction += $deduction;
                $items[] = [
                    'type' => 'DEDUCTION',
                    'category' => 'Violation Deduction',
                    'amount' => $deduction,
                    'reference_type' => 'violation',
                    'reference_id' => $violation->id,
                ];
            }
        }
        
        return [
            'total' => $totalDeduction,
            'items' => $items,
        ];
    }
    
    /**
     * Calculate cash advance deductions
     */
    private function calculateCashAdvanceDeductions(Employee $employee, PayrollPeriod $period): array
    {
        $advances = $this->cashAdvanceRepo->getDeductibleAdvances($employee->id);
        
        $totalDeduction = 0;
        $items = [];
        
        foreach ($advances as $advance) {
            $totalDeduction += $advance->amount;
            $items[] = [
                'type' => 'DEDUCTION',
                'category' => 'Cash Advance',
                'amount' => $advance->amount,
                'reference_type' => 'cash_advance',
                'reference_id' => $advance->id,
            ];
        }
        
        return [
            'total' => $totalDeduction,
            'items' => $items,
        ];
    }
    
    /**
     * Finalize payroll period
     */
    public function finalizePeriod(PayrollPeriod $period): void
    {
        DB::transaction(function () use ($period) {
            // Update all payrolls to FINALIZED
            $period->payrolls()->update(['status' => 'FINALIZED']);
            
            // Update period status
            $period->update([
                'status' => 'CLOSED',
                'finalized_by' => auth()->id(),
                'finalized_at' => now(),
            ]);
            
            // Update cash advances to COMPLETED
            CashAdvance::where('payroll_period_id', $period->id)
                ->update(['status' => 'Completed']);
            
            // Generate payslips
            foreach ($period->payrolls as $payroll) {
                $this->payslipService->generatePayslip($payroll);
            }
        });
    }
}
```

---

## 2. Repository Pattern Implementation

### 2.1 AttendanceRepository

```php
class AttendanceRepository
{
    public function getEmployeeDayLogs(int $employeeId, Carbon $date): Collection
    {
        return AttendanceLog::where('employee_id', $employeeId)
            ->whereDate('log_datetime', $date)
            ->orderBy('log_datetime')
            ->get();
    }
    
    public function getEmployeePeriodRecords(int $employeeId, Carbon $startDate, Carbon $endDate): Collection
    {
        return AttendanceRecord::where('employee_id', $employeeId)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->get();
    }
}
```

### 2.2 ViolationRepository

```php
class ViolationRepository
{
    public function getEmployeePeriodViolations(int $employeeId, Carbon $startDate, Carbon $endDate): Collection
    {
        return AttendanceViolation::where('employee_id', $employeeId)
            ->whereBetween('attendance_date', [$startDate, $endDate])
            ->where('resolved', false)
            ->get();
    }
}
```

### 2.3 CashAdvanceRepository

```php
class CashAdvanceRepository
{
    public function getDeductibleAdvances(int $employeeId): Collection
    {
        return CashAdvance::where('employee_id', $employeeId)
            ->where('status', 'Active')
            ->get();
    }
}
```

---

## 3. Controller Implementation

### 3.1 PayrollController

```php
class PayrollController extends Controller
{
    public function __construct(
        private PayrollService $payrollService,
        private CashAdvanceService $cashAdvanceService
    ) {}
    
    public function processGeneration(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'start_date' => 'required|date|before:end_date',
            'end_date' => 'required|date|after:start_date',
            'payroll_date' => 'required|date|after:end_date',
        ]);
        
        try {
            $period = PayrollPeriod::create([
                'department_id' => $validated['department_id'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'payroll_date' => $validated['payroll_date'],
                'status' => 'OPEN',
                'created_by' => auth()->id(),
            ]);
            
            $results = $this->payrollService->generatePayroll($period);
            
            return redirect()->route('payroll.period', $period->id)
                ->with('success', "Payroll generated: {$results['success']} successful, {$results['failed']} failed");
        } catch (Exception $e) {
            return back()->with('error', 'Payroll generation failed: ' . $e->getMessage());
        }
    }
    
    public function finalizePeriod(int $id): RedirectResponse
    {
        try {
            $period = PayrollPeriod::findOrFail($id);
            
            $this->payrollService->finalizePeriod($period);
            
            return redirect()->route('payroll.period', $period->id)
                ->with('success', 'Payroll period finalized successfully');
        } catch (Exception $e) {
            return back()->with('error', 'Finalization failed: ' . $e->getMessage());
        }
    }
}
```

---

## 4. Validation & Error Handling

### 4.1 Custom Validation Rules

```php
// In AppServiceProvider
Validator::extend('valid_payroll_period', function ($attribute, $value, $parameters, $validator) {
    $period = PayrollPeriod::find($value);
    
    if (!$period || $period->status !== 'OPEN') {
        return false;
    }
    
    return true;
});

Validator::extend('sufficient_daily_rate', function ($attribute, $value, $parameters, $validator) {
    return $value > 0;
});
```

### 4.2 Exception Handling

```php
class PayrollException extends Exception {}
class ValidationException extends Exception {}
class InsufficientDataException extends Exception {}

// In exception handler
public function render($request, Throwable $exception)
{
    if ($exception instanceof PayrollException) {
        return response()->json([
            'success' => false,
            'message' => $exception->getMessage(),
            'error_code' => 'PAYROLL_ERROR',
        ], 422);
    }
    
    return parent::render($request, $exception);
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

```php
class PayrollServiceTest extends TestCase
{
    public function test_calculate_payroll_with_basic_attendance()
    {
        $employee = Employee::factory()->create(['daily_rate' => 500]);
        $period = PayrollPeriod::factory()->create();
        
        AttendanceRecord::factory()->create([
            'employee_id' => $employee->id,
            'rendered' => 1.0,
            'total_late_minutes' => 0,
            'overtime_minutes' => 0,
            'undertime_minutes' => 0,
        ]);
        
        $result = $this->payrollService->calculatePayroll($employee, $period);
        
        $this->assertEquals(500, $result['basic_pay']);
        $this->assertEquals(0, $result['overtime_pay']);
    }
}
```

### 5.2 Integration Tests

```php
class PayrollGenerationTest extends TestCase
{
    public function test_generate_payroll_for_period()
    {
        $period = PayrollPeriod::factory()->create();
        $employees = Employee::factory(10)->create(['department_id' => $period->department_id]);
        
        $results = $this->payrollService->generatePayroll($period);
        
        $this->assertEquals(10, $results['success']);
        $this->assertEquals(0, $results['failed']);
        $this->assertEquals(10, $period->payrolls()->count());
    }
}
```

---

## Summary

This implementation guide provides:

1. **Service Layer Details** - Complete implementation of core services
2. **Repository Pattern** - Data access abstraction
3. **Controller Implementation** - HTTP request handling
4. **Validation & Error Handling** - Robust error management
5. **Testing Strategy** - Unit and integration tests

The implementation follows Laravel best practices and maintains clean separation of concerns.
