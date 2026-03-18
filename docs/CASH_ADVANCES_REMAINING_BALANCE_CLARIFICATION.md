# Cash Advances - Remaining Balance Clarification

## Issue
User questioned why the "Remaining" balance still shows an amount after all cash advances have been applied/deducted.

## Solution
Fixed the `getTotalRemainingBalance()` method to only count **Active** advances (not yet deducted), not all unpaid advances.

## Behavior

### Before Fix
- **Remaining Balance** = Sum of all 'Active' AND 'Deducted' advances
- Result: Balance would still show even after applying all deductions

### After Fix
- **Remaining Balance** = Sum of only 'Active' advances
- Result: Balance shows zero after all advances are deducted

## Cash Advance States

### Active
- Status: `Active`
- Meaning: Newly created, not yet deducted from payroll
- Included in Remaining Balance: **YES**
- Can be removed: **YES**
- Can be applied: **YES**

### Deducted
- Status: `Deducted`
- Meaning: Applied to payroll in current period
- Included in Remaining Balance: **NO** (after fix)
- Can be removed: **NO**
- Can be applied: **NO**

### Completed
- Status: `Completed`
- Meaning: Fully paid off (future state)
- Included in Remaining Balance: **NO**
- Can be removed: **NO**
- Can be applied: **NO**

## Example Workflow

### Scenario: Employee with 3 cash advances

**Initial State:**
- Advance 1: 1000 (Active)
- Advance 2: 500 (Active)
- Advance 3: 750 (Active)
- **Remaining Balance: 2250**

**After Applying Advance 1:**
- Advance 1: 1000 (Deducted) ← Applied to payroll
- Advance 2: 500 (Active)
- Advance 3: 750 (Active)
- **Remaining Balance: 1250** ← Only Active advances counted

**After Applying Advance 2:**
- Advance 1: 1000 (Deducted)
- Advance 2: 500 (Deducted) ← Applied to payroll
- Advance 3: 750 (Active)
- **Remaining Balance: 750** ← Only Active advances counted

**After Applying Advance 3:**
- Advance 1: 1000 (Deducted)
- Advance 2: 500 (Deducted)
- Advance 3: 750 (Deducted) ← Applied to payroll
- **Remaining Balance: 0** ← No Active advances left

## UI Display

### Cash Advances Tab - Table Columns

| Column | Shows | Calculation |
|--------|-------|-------------|
| Available | Active advances | Advances with status = 'Active' |
| Remaining | Pending balance | Sum of all Active advances |
| Actions | View Payslip | Link to employee's payslip |

### Payslip Display

| Section | Shows |
|---------|-------|
| Deductions | Cash advance deduction applied in this period |
| Notes | Remaining unpaid balance (sum of Active advances) |

## Code Changes

### File: `app/Services/CashAdvanceService.php`

**Method: `getTotalRemainingBalance()`**

```php
// Before
public function getTotalRemainingBalance(Employee $employee): float
{
    return (float) $employee->cashAdvances()
        ->whereIn('status', ['Active', 'Deducted'])  // Included Deducted
        ->sum('amount');
}

// After
public function getTotalRemainingBalance(Employee $employee): float
{
    return (float) $employee->cashAdvances()
        ->active()  // Only Active advances
        ->sum('amount');
}
```

## Testing

### Test Case: Verify Remaining Balance Updates

1. **Add 3 cash advances** to an employee:
   - Advance 1: 1000
   - Advance 2: 500
   - Advance 3: 750
   - Expected Remaining: 2250

2. **Apply Advance 1**:
   - Click "Apply" button
   - Expected Remaining: 1250 (2250 - 1000)

3. **Apply Advance 2**:
   - Click "Apply" button
   - Expected Remaining: 750 (1250 - 500)

4. **Apply Advance 3**:
   - Click "Apply" button
   - Expected Remaining: 0 (750 - 750)

5. **Verify Payslip**:
   - View payslip
   - Should show all 3 deductions applied
   - Remaining balance note should show 0

## Notes

- Deducted advances are still tracked in the database for audit purposes
- They appear in the payslip as historical deductions
- The "Remaining Balance" on payslips shows only unpaid (Active) advances
- This aligns with the specification requirement for "Pending_Deduction_Amount"
