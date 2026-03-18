# Dismissed Violations & Payroll Impact - Complete Analysis

## Current Status: ⚠️ NOT YET IMPLEMENTED

**Important:** The violation deduction logic is **NOT currently implemented** in the PayrollService. This means:

1. **Dismissed violations have NO effect on payroll** (currently)
2. **Active violations also have NO effect on payroll** (currently)
3. Violations are detected and stored, but not used in payroll calculations

---

## What SHOULD Happen (Design Intent)

Based on the system design, here's what was intended:

### Dismissed Violations
- **Effect on payroll:** ❌ NO DEDUCTIONS
- **Reason:** Violation is marked as invalid/should not be counted
- **Example:** Employee was on approved leave → Violation dismissed → No deduction applied

### Active (Non-Dismissed) Violations
- **Effect on payroll:** ✅ DEDUCTIONS APPLIED
- **Reason:** Violation is valid and should affect compensation
- **Example:** Employee was late → Violation created → Deduction applied to payroll

---

## Current PayrollService Implementation

**Location:** `app/Services/PayrollService.php`

The current payroll calculation includes:

```php
public function calculatePayroll(Employee $employee, $attendanceRecords, PayrollPeriod $period = null): array
{
    // ... code ...
    
    // Calculate earnings
    $basicPay = round($daysWorked * $dailyRate, 2);
    $overtimePay = round(($totalOvertimeMinutes / 60) * $hourlyRate * 1.25, 2);
    
    // Calculate deductions
    $latePenalty = round(($totalLateMinutes / 60) * $hourlyRate, 2);
    $undertimePenalty = round(($totalUndertimeMinutes / 60) * $hourlyRate, 2);
    
    // Add contributions (SSS, PhilHealth, Pag-IBIG)
    // ... code ...
    
    // NO VIOLATION DEDUCTIONS HERE!
}
```

**What's missing:**
- No query for violations
- No filtering of dismissed violations
- No deduction calculations based on violation types
- No violation deduction items added to payroll

---

## What Needs to Be Implemented

### Step 1: Query Active Violations
```php
// Get active (non-dismissed) violations for the employee during the payroll period
$violations = AttendanceViolation::active()  // Filters out dismissed_at IS NOT NULL
    ->where('employee_id', $employee->id)
    ->whereBetween('violation_date', [$period->start_date, $period->end_date])
    ->get();
```

### Step 2: Calculate Violation Deductions
Based on violation type:

```php
foreach ($violations as $violation) {
    switch ($violation->violation_type) {
        case 'Cumulative Grace Period Exceeded':
            // Deduction = (deductible_minutes ÷ 60) × hourly_rate
            $deductionAmount = ($violation->metadata['deductible_minutes'] / 60) * $hourlyRate;
            break;
            
        case 'Unexcused Absence':
            // Deduction = 1.0 × daily_rate
            $deductionAmount = $dailyRate;
            break;
            
        case 'AWOL':
            // Deduction = 3.0 × daily_rate
            $deductionAmount = $dailyRate * 3;
            break;
            
        // ... other violation types ...
    }
    
    $deductions[] = [
        'category' => 'Violation: ' . $violation->violation_type,
        'amount' => $deductionAmount,
        'reference_id' => $violation->id,
    ];
}
```

### Step 3: Add to Payroll Items
```php
// Create violation deduction items
foreach ($violationDeductions as $deduction) {
    PayrollItem::create([
        'payroll_id' => $payroll->id,
        'type' => 'DEDUCTION',
        'category' => $deduction['category'],
        'amount' => $deduction['amount'],
        'reference_id' => $deduction['reference_id'],
    ]);
}
```

---

## How Dismissed Violations Prevent Deductions

The key is the `.active()` scope in the query:

```php
// Model scope in AttendanceViolation.php
public function scopeActive(Builder $query): Builder
{
    return $query->whereNull('dismissed_at');
}
```

**When a violation is dismissed:**
```php
$violation->dismiss(auth()->id());
// Sets: dismissed_at = now(), dismissed_by = user_id
```

**When payroll queries violations:**
```php
$violations = AttendanceViolation::active()  // ← This filters out dismissed violations!
    ->where('employee_id', $employee->id)
    ->whereBetween('violation_date', [$period->start_date, $period->end_date])
    ->get();
```

**Result:**
- Dismissed violations are NOT included in the query
- No deduction is calculated for dismissed violations
- Employee's payroll is not affected

---

## Timeline of Events

### Scenario 1: Violation is Reviewed (NOT Dismissed)

```
1. Violation detected on March 15
   - Status: Pending
   - dismissed_at: NULL
   
2. HR reviews violation
   - Status: Changed to "Reviewed"
   - dismissed_at: Still NULL
   
3. Payroll generated for March 1-31
   - Query: SELECT * FROM violations WHERE dismissed_at IS NULL
   - Result: Violation IS included
   - Deduction: APPLIED to payroll
   
4. Employee receives payslip
   - Shows violation deduction
```

### Scenario 2: Violation is Dismissed

```
1. Violation detected on March 15
   - Status: Pending
   - dismissed_at: NULL
   
2. HR reviews violation
   - Status: Changed to "Reviewed"
   - dismissed_at: Still NULL
   
3. Employee provides proof of approved leave
   - HR clicks "Dismiss Violation"
   - Status: Still "Reviewed" (unchanged)
   - dismissed_at: NOW() (e.g., 2026-03-16 10:30:00)
   - dismissed_by: 1 (HR user ID)
   
4. Payroll generated for March 1-31
   - Query: SELECT * FROM violations WHERE dismissed_at IS NULL
   - Result: Violation is NOT included (dismissed_at is not NULL)
   - Deduction: NOT applied to payroll
   
5. Employee receives payslip
   - No violation deduction shown
```

---

## Database State Comparison

### Active Violation (Will be deducted)
```
id: 1
employee_id: 5
violation_date: 2026-03-15
violation_type: Cumulative Grace Period Exceeded
status: Reviewed
dismissed_at: NULL          ← Key: NULL means active
dismissed_by: NULL
```

### Dismissed Violation (Will NOT be deducted)
```
id: 1
employee_id: 5
violation_date: 2026-03-15
violation_type: Cumulative Grace Period Exceeded
status: Reviewed
dismissed_at: 2026-03-16 10:30:00  ← Key: Has timestamp means dismissed
dismissed_by: 1                      ← Who dismissed it
```

---

## Violation Deduction Rules (From Design)

| Violation Type | Deduction Formula | Example |
|---|---|---|
| **Cumulative Grace Period Exceeded** | (Deductible Minutes ÷ 60) × Hourly Rate | 30 deductible minutes × $10/hr = $5 |
| **Unexcused Absence** | 1.0 × Daily Rate | Daily rate $80 = $80 deduction |
| **AWOL** | 3.0 × Daily Rate | Daily rate $80 × 3 = $240 deduction |
| **Biometrics Policy Violation** | (Missing Minutes ÷ 60) × Hourly Rate | 60 missing minutes × $10/hr = $10 |
| **Missing Logs** | (Missing Minutes ÷ 60) × Hourly Rate | 120 missing minutes × $10/hr = $20 |
| **Unauthorized Work** | (Undertime Minutes ÷ 60) × Hourly Rate | 30 undertime minutes × $10/hr = $5 |
| **Excessive Undertime** | (Undertime Minutes ÷ 60) × Hourly Rate | 60 undertime minutes × $10/hr = $10 |
| **Frequent Half Day** | (Undertime Minutes ÷ 60) × Hourly Rate | 240 undertime minutes × $10/hr = $40 |

---

## Implementation Checklist

To implement violation deductions in payroll:

- [ ] Create `ViolationDeductionService` class
- [ ] Implement method to get active violations for employee/period
- [ ] Implement method to calculate deduction amount by violation type
- [ ] Implement method to apply violation deductions to payroll
- [ ] Update `PayrollService::calculatePayroll()` to include violation deductions
- [ ] Add violation deduction items to payroll items
- [ ] Update payslip display to show violation deductions
- [ ] Write tests for violation deduction calculations
- [ ] Write tests for dismissed violation exclusion
- [ ] Update documentation

---

## Current Behavior vs Intended Behavior

| Scenario | Current Behavior | Intended Behavior |
|----------|---|---|
| Violation created | ✅ Stored in DB | ✅ Stored in DB |
| Violation reviewed | ✅ Status updated | ✅ Status updated |
| Violation dismissed | ✅ Marked as dismissed | ✅ Marked as dismissed |
| Payroll generated | ❌ Violations ignored | ✅ Active violations deducted |
| Dismissed violation in payroll | ❌ N/A (not implemented) | ✅ NOT deducted |
| Payslip shows violations | ❌ No violation items | ✅ Shows violation deductions |

---

## Summary

**Current State:**
- Dismissed violations have **NO effect** on payroll (because violation deductions aren't implemented at all)
- Active violations also have **NO effect** on payroll (same reason)

**Intended State:**
- Dismissed violations should have **NO effect** on payroll (by design)
- Active violations should have **deductions applied** to payroll (by design)

**To Achieve Intended State:**
- Implement violation deduction logic in PayrollService
- Use the `.active()` scope to automatically exclude dismissed violations
- Calculate deductions based on violation type and metadata
- Add violation deduction items to payroll

The infrastructure is already in place (dismissed_at, dismissed_by fields, active() scope). We just need to implement the payroll integration!
