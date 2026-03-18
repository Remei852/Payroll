# Integration Workflows & Patterns
## Attendance & Payroll System

---

## 1. End-to-End Workflows

### 1.1 Complete Payroll Processing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYROLL PROCESSING WORKFLOW                  │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: ATTENDANCE PROCESSING
├─ CSV Upload
│  └─ AttendanceService::processCsvFile()
│     ├─ Parse CSV rows
│     ├─ Validate format
│     └─ Store in attendance_logs
│
├─ Log Processing
│  └─ AttendanceService::processLogsForDateRange()
│     ├─ Filter double-taps
│     ├─ Handle rapid re-taps
│     ├─ Assign to time slots
│     ├─ Calculate confidence score
│     └─ Create attendance_records
│
├─ Violation Detection
│  └─ ViolationDetectionService::detectViolations()
│     ├─ Check structural violations
│     ├─ Check policy violations
│     ├─ Determine ambiguity
│     └─ Create violation records
│
└─ Human Review (if needed)
   └─ ReviewService::getReviewQueue()
      ├─ Display ambiguous cases
      ├─ Allow manual corrections
      └─ Approve or reject

PHASE 2: PAYROLL GENERATION
├─ Create Payroll Period
│  └─ PayrollPeriod::create()
│     ├─ Set department
│     ├─ Set date range
│     └─ Set status to OPEN
│
├─ Generate Payroll
│  └─ PayrollService::generatePayroll()
│     ├─ For each employee:
│     │  ├─ Fetch attendance records
│     │  ├─ Calculate basic pay
│     │  ├─ Calculate overtime
│     │  ├─ Apply late penalties
│     │  ├─ Apply undertime penalties
│     │  ├─ Apply contributions
│     │  ├─ Apply violation deductions
│     │  ├─ Apply cash advance deductions
│     │  └─ Calculate net pay
│     └─ Create payroll records
│
├─ Review Payroll
│  └─ Admin reviews:
│     ├─ Summary totals
│     ├─ Individual payslips
│     ├─ Anomalies
│     └─ Regenerate if needed
│
└─ Finalize Period
   └─ PayrollService::finalizePeriod()
      ├─ Lock all payroll records
      ├─ Update period status
      ├─ Update cash advance status
      ├─ Generate payslips
      └─ Create audit trail

PHASE 3: DISTRIBUTION
├─ Generate Payslips
│  └─ PayslipService::generatePayslip()
│     ├─ Format payslip
│     ├─ Include all details
│     └─ Generate PDF
│
├─ Distribute Payslips
│  └─ Admin actions:
│     ├─ Print payslips
│     ├─ Email payslips
│     └─ Record distribution
│
└─ Archive Records
   └─ Maintain historical records
      ├─ Payroll records
      ├─ Payslips
      └─ Audit trail
```

### 1.2 Attendance Record Processing Flow

```
Raw Logs (attendance_logs)
    ↓
[Filter Double-Taps]
    ↓
[Handle Rapid Re-Taps]
    ↓
[Assign to Time Slots]
    ↓
[Calculate Metrics]
    ├─ Late Minutes
    ├─ Undertime Minutes
    ├─ Overtime Minutes
    └─ Rendered Hours
    ↓
[Calculate Confidence Score]
    ↓
[Detect Violations]
    ├─ Structural Violations
    ├─ Policy Violations
    └─ Ambiguity Detection
    ↓
[Create Attendance Record]
    ├─ Status: clean (confidence >= 70%)
    └─ Status: flagged (confidence < 70%)
    ↓
[If Flagged: Add to Review Queue]
    ├─ Display to HR
    ├─ Allow manual corrections
    └─ Approve or reject
    ↓
[Final Attendance Record]
    └─ Ready for payroll
```

### 1.3 Payroll Calculation Flow

```
Attendance Records
├─ Days Worked (rendered)
├─ Late Minutes
├─ Overtime Minutes
└─ Undertime Minutes
    ↓
[Calculate Basic Pay]
    └─ Days Worked × Daily Rate
    ↓
[Calculate Overtime Pay]
    └─ (Overtime Minutes ÷ 60) × Hourly Rate × 1.25
    ↓
[Calculate Gross Pay]
    └─ Basic Pay + Overtime Pay
    ↓
[Calculate Deductions]
    ├─ Late Penalty: (Late Minutes ÷ 60) × Hourly Rate
    ├─ Undertime Penalty: (Undertime Minutes ÷ 60) × Hourly Rate
    ├─ Contributions: SSS + PhilHealth + Pag-IBIG
    ├─ Violation Deductions: Based on violation type
    └─ Cash Advance Deductions: Selected advances
    ↓
[Calculate Net Pay]
    └─ Gross Pay - Total Deductions
    ↓
[Create Payroll Items]
    ├─ EARNING items
    └─ DEDUCTION items
    ↓
[Final Payroll Record]
    └─ Ready for finalization
```

### 1.4 Cash Advance Integration Flow

```
Cash Advance Created
├─ Employee: Selected
├─ Amount: Specified
├─ Status: Active
└─ Created By: Admin
    ↓
[During Payroll Generation]
    ├─ Display active advances
    ├─ Admin selects advances to deduct
    └─ Create PayrollItem (Cash Advance category)
    ↓
[Update Cash Advance]
    ├─ Status: Applied
    ├─ Deduction Date: Set
    └─ Payroll Period: Linked
    ↓
[During Payroll Finalization]
    ├─ Update status: Completed
    └─ Record completion date
    ↓
[Payslip Display]
    ├─ Show cash advance deduction
    ├─ Show remaining balance
    └─ Show deduction date
```

---

## 2. Data Integration Points

### 2.1 Attendance → Payroll Integration

```php
// In PayrollService::calculatePayroll()

// Step 1: Fetch attendance records
$records = AttendanceRecord::where('employee_id', $employee->id)
    ->whereBetween('attendance_date', [$period->start_date, $period->end_date])
    ->get();

// Step 2: Extract metrics
$daysWorked = $records->sum('rendered');
$totalLateMinutes = $records->sum('total_late_minutes');
$totalOvertimeMinutes = $records->sum('overtime_minutes');
$totalUndertimeMinutes = $records->sum('undertime_minutes');

// Step 3: Use in calculations
$basicPay = $daysWorked * $dailyRate;
$overtimePay = ($totalOvertimeMinutes / 60) * $hourlyRate * 1.25;
$latePenalty = ($totalLateMinutes / 60) * $hourlyRate;
$undertimePenalty = ($totalUndertimeMinutes / 60) * $hourlyRate;

// Step 4: Create payroll items
$payroll->items()->create([
    'type' => 'EARNING',
    'category' => 'Basic Pay',
    'amount' => $basicPay,
]);
```

### 2.2 Violations → Payroll Integration

```php
// In PayrollService::calculateViolationDeductions()

// Step 1: Fetch violations for period
$violations = AttendanceViolation::where('employee_id', $employee->id)
    ->whereBetween('attendance_date', [$period->start_date, $period->end_date])
    ->where('resolved', false)
    ->get();

// Step 2: Calculate deductions by type
foreach ($violations as $violation) {
    $deduction = match ($violation->violation_type) {
        'CUMULATIVE_GRACE_PERIOD' => ($violation->duration_minutes / 60) * $hourlyRate,
        'UNEXCUSED_ABSENCE' => $dailyRate,
        'AWOL' => $dailyRate * 3,
        default => 0,
    };
    
    // Step 3: Create payroll item
    if ($deduction > 0) {
        $payroll->items()->create([
            'type' => 'DEDUCTION',
            'category' => 'Violation Deduction',
            'amount' => $deduction,
            'reference_type' => 'violation',
            'reference_id' => $violation->id,
        ]);
    }
}
```

### 2.3 Cash Advances → Payroll Integration

```php
// In PayrollService::calculateCashAdvanceDeductions()

// Step 1: Fetch deductible advances
$advances = CashAdvance::where('employee_id', $employee->id)
    ->where('status', 'Active')
    ->get();

// Step 2: Create deduction items
foreach ($advances as $advance) {
    $payroll->items()->create([
        'type' => 'DEDUCTION',
        'category' => 'Cash Advance',
        'amount' => $advance->amount,
        'reference_type' => 'cash_advance',
        'reference_id' => $advance->id,
    ]);
    
    // Step 3: Update advance status
    $advance->update([
        'status' => 'Deducted',
        'deduction_date' => now(),
        'payroll_period_id' => $period->id,
    ]);
}
```

---

## 3. Error Handling & Recovery

### 3.1 Transaction Management

```php
// Ensure data consistency with transactions
DB::transaction(function () use ($period) {
    // Generate payroll for all employees
    $employees = Employee::where('department_id', $period->department_id)->get();
    
    foreach ($employees as $employee) {
        try {
            $this->generateEmployeePayroll($period, $employee);
        } catch (Exception $e) {
            // Rollback entire transaction if any employee fails
            throw $e;
        }
    }
    
    // Finalize period
    $period->update(['status' => 'CLOSED']);
});
```

### 3.2 Validation & Error Handling

```php
// Validate before processing
public function validatePayrollReadiness(PayrollPeriod $period): array
{
    $errors = [];
    
    // Check all employees have attendance records
    $employees = Employee::where('department_id', $period->department_id)->get();
    
    foreach ($employees as $employee) {
        $records = AttendanceRecord::where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$period->start_date, $period->end_date])
            ->count();
        
        if ($records === 0) {
            $errors[] = "Employee {$employee->name} has no attendance records";
        }
    }
    
    // Check daily rates are set
    $employeesWithoutRate = Employee::where('department_id', $period->department_id)
        ->whereNull('daily_rate')
        ->count();
    
    if ($employeesWithoutRate > 0) {
        $errors[] = "{$employeesWithoutRate} employees have no daily rate set";
    }
    
    return [
        'ready' => empty($errors),
        'errors' => $errors,
    ];
}
```

### 3.3 Retry Logic

```php
// Implement retry logic for transient failures
public function generatePayrollWithRetry(PayrollPeriod $period, int $maxRetries = 3): array
{
    $attempt = 0;
    $lastError = null;
    
    while ($attempt < $maxRetries) {
        try {
            return $this->generatePayroll($period);
        } catch (Exception $e) {
            $lastError = $e;
            $attempt++;
            
            if ($attempt < $maxRetries) {
                // Exponential backoff
                sleep(2 ** $attempt);
                
                // Log retry attempt
                Log::warning("Payroll generation retry {$attempt}/{$maxRetries}", [
                    'period_id' => $period->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
    
    // All retries failed
    throw $lastError;
}
```

---

## 4. Audit Trail & Logging

### 4.1 Audit Trail Implementation

```php
// Log all significant actions
class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'model_type',
        'model_id',
        'changes',
        'ip_address',
        'user_agent',
    ];
    
    protected $casts = [
        'changes' => 'array',
    ];
}

// Create audit log entry
AuditLog::create([
    'user_id' => auth()->id(),
    'action' => 'payroll_generated',
    'model_type' => 'PayrollPeriod',
    'model_id' => $period->id,
    'changes' => [
        'status' => ['OPEN' => 'PROCESSING'],
        'employee_count' => $employeeCount,
        'total_gross' => $totalGross,
    ],
    'ip_address' => request()->ip(),
    'user_agent' => request()->userAgent(),
]);
```

### 4.2 Logging Strategy

```php
// Log different levels of information
Log::info('Payroll generation started', [
    'period_id' => $period->id,
    'department_id' => $period->department_id,
    'employee_count' => $employeeCount,
]);

Log::debug('Processing employee payroll', [
    'employee_id' => $employee->id,
    'basic_pay' => $basicPay,
    'gross_pay' => $grossPay,
]);

Log::warning('Payroll validation warning', [
    'period_id' => $period->id,
    'warning' => 'Some employees have no attendance records',
]);

Log::error('Payroll generation failed', [
    'period_id' => $period->id,
    'error' => $e->getMessage(),
    'trace' => $e->getTraceAsString(),
]);
```

---

## 5. Performance Optimization

### 5.1 Query Optimization

```php
// Use eager loading to prevent N+1 queries
$payrolls = Payroll::with([
    'employee',
    'employee.department',
    'payrollPeriod',
    'items',
])->where('payroll_period_id', $period->id)->get();

// Use select to fetch only needed columns
$employees = Employee::select('id', 'name', 'daily_rate', 'department_id')
    ->where('department_id', $period->department_id)
    ->get();

// Use chunk for large datasets
AttendanceRecord::where('status', 'clean')
    ->chunk(1000, function ($records) {
        // Process 1000 records at a time
    });
```

### 5.2 Caching Strategy

```php
// Cache employee data
$employee = Cache::remember("employee:{$id}", 3600, function () {
    return Employee::with('contributions', 'department')->find($id);
});

// Cache configuration
$config = Cache::remember('payroll_config', 86400, function () {
    return ProcessingConfiguration::all()->keyBy('config_key');
});

// Cache payroll summary
$summary = Cache::remember("payroll:{$periodId}:summary", 1800, function () {
    return Payroll::where('payroll_period_id', $periodId)
        ->selectRaw('SUM(gross_pay) as total_gross, SUM(net_pay) as total_net')
        ->first();
});

// Invalidate cache when data changes
Cache::forget("employee:{$id}");
Cache::forget("payroll:{$periodId}:summary");
```

### 5.3 Database Indexing

```sql
-- Attendance queries
CREATE INDEX idx_attendance_logs_employee_datetime 
ON attendance_logs(employee_id, log_datetime DESC);

CREATE INDEX idx_attendance_records_employee_date 
ON attendance_records(employee_id, attendance_date DESC);

-- Payroll queries
CREATE INDEX idx_payrolls_period_employee 
ON payrolls(payroll_period_id, employee_id);

CREATE INDEX idx_payroll_items_payroll_type 
ON payroll_items(payroll_id, type);

-- Reporting queries
CREATE INDEX idx_attendance_records_status_date 
ON attendance_records(status, attendance_date);

CREATE INDEX idx_violations_severity_date 
ON attendance_violations(severity, attendance_date DESC);
```

---

## 6. Reporting & Analytics

### 6.1 Payroll Summary Report

```php
// Generate payroll summary
public function generatePayrollSummary(PayrollPeriod $period): array
{
    $payrolls = $period->payrolls()->with('employee')->get();
    
    return [
        'period' => [
            'id' => $period->id,
            'department' => $period->department->name,
            'start_date' => $period->start_date,
            'end_date' => $period->end_date,
        ],
        'summary' => [
            'employee_count' => $payrolls->count(),
            'total_gross_pay' => $payrolls->sum('gross_pay'),
            'total_deductions' => $payrolls->sum('total_deductions'),
            'total_net_pay' => $payrolls->sum('net_pay'),
        ],
        'breakdown' => [
            'by_department' => $this->breakdownByDepartment($payrolls),
            'by_deduction_type' => $this->breakdownByDeductionType($payrolls),
            'by_violation_type' => $this->breakdownByViolationType($period),
        ],
    ];
}
```

### 6.2 Violation Impact Report

```php
// Generate violation impact report
public function generateViolationImpactReport(PayrollPeriod $period): array
{
    $violations = AttendanceViolation::whereBetween('attendance_date', [
        $period->start_date,
        $period->end_date,
    ])->get();
    
    return [
        'total_violations' => $violations->count(),
        'by_type' => $violations->groupBy('violation_type')->map->count(),
        'by_severity' => $violations->groupBy('severity')->map->count(),
        'total_deduction_amount' => $this->calculateViolationDeductionAmount($violations),
        'affected_employees' => $violations->pluck('employee_id')->unique()->count(),
    ];
}
```

---

## Summary

This integration guide provides:

1. **End-to-End Workflows** - Complete payroll processing flow
2. **Data Integration** - How different domains interact
3. **Error Handling** - Transaction management and recovery
4. **Audit Trail** - Logging and compliance
5. **Performance** - Optimization strategies
6. **Reporting** - Analytics and summaries

The system is designed for reliability, auditability, and performance at scale.
