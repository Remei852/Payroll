# Cash Advances Management System Guide

## Overview

The Cash Advances Management System allows administrators to manage employee cash advances and integrate them into the payroll generation process. This system is designed to streamline the process of granting, tracking, and deducting cash advances from employee salaries.

## Key Features

- **Admin-Only Management**: Only administrators can add, manage, and apply cash advances
- **Integrated Payroll**: Cash advances are seamlessly integrated into the payroll generation workflow
- **Status Tracking**: Track cash advances through different statuses (Active, Deducted, Completed)
- **Remaining Balance**: Employees can see their remaining unpaid balance on payslips
- **Hardcopy Payslips**: Payslips are provided as hardcopy/physical copies with cash advance information

## System Workflow

### 1. Adding a Cash Advance

**When**: During payroll generation or at any time
**Who**: Admin only
**How**:
1. Navigate to the Payroll Generation page
2. Select a department
3. Select an employee from the department
4. In the "Cash Advances" section, enter:
   - Amount (required)
   - Reason (optional)
5. Click "Add Advance"

**Status**: New advances are created with status "Active"

### 2. Viewing Cash Advances

**For an Employee**:
- Deductible Advances: Shows all "Active" advances available to deduct
- Remaining Balance: Shows total of all "Active" and "Deducted" advances

**API Endpoint**:
```
GET /api/employees/{employee_id}/cash-advances
```

**Response**:
```json
{
  "deductible": [
    {
      "id": 1,
      "amount": 5000,
      "reason": "Emergency expenses",
      "status": "Active",
      "created_at": "2026-03-13T10:00:00Z"
    }
  ],
  "remaining": [
    {
      "id": 1,
      "amount": 5000,
      "status": "Active"
    },
    {
      "id": 2,
      "amount": 3000,
      "status": "Deducted"
    }
  ],
  "totalRemaining": 8000
}
```

### 3. Applying a Deduction

**When**: During payroll generation
**Who**: Admin only
**How**:
1. In the Payroll Generation page, select an employee
2. In the "Available to Deduct" table, click "Apply" on the desired advance
3. The system will:
   - Create a PayrollItem with type "DEDUCTION" and category "Cash Advance"
   - Update the advance status to "Deducted"
   - Recalculate payroll totals

**API Endpoint**:
```
POST /api/payroll/{payroll_id}/apply-cash-advance
```

**Request Body**:
```json
{
  "cash_advance_id": 1
}
```

### 4. Removing a Cash Advance

**When**: Before deduction is applied
**Who**: Admin only
**How**:
1. In the Payroll Generation page, select an employee
2. In the "Available to Deduct" table, click "Remove" on the desired advance
3. The advance will be deleted from the system

**Restrictions**:
- Can only remove advances with status "Active"
- Cannot remove advances that have been "Deducted" or "Completed"

**API Endpoint**:
```
DELETE /api/cash-advances/{cash_advance_id}
```

### 5. Viewing on Payslip

**What Appears**:
- Cash advance deductions applied in the current period
- Remaining unpaid balance (if any)

**Format**:
- Deductions appear in the "Deductions" section with category "Cash Advance"
- Remaining balance appears in a separate "Cash Advance Deduction" note section
- Only shows remaining balance if amount > 0

**Example Payslip Section**:
```
Deductions:
- Cash Advance: ₱2,000.00

Cash Advance Deduction:
Total cash advance deducted in this period: ₱2,000.00
Remaining unpaid balance: ₱3,000.00
```

## Database Schema

### cash_advances Table

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| employee_id | bigint | Foreign key to employees table |
| amount | decimal(10,2) | Cash advance amount |
| reason | text | Reason for cash advance (optional) |
| status | enum | Status: Active, Deducted, Completed |
| created_by | bigint | Foreign key to users table (admin who created) |
| payroll_period_id | bigint | Foreign key to payroll_periods table (optional) |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |
| deducted_at | timestamp | When deduction was applied (nullable) |

### Indexes

- `employee_id` + `status` for quick filtering
- `created_at` for sorting

## API Endpoints

### Get Employee Cash Advances
```
GET /api/employees/{employee_id}/cash-advances
```
Returns deductible, remaining, and total remaining balance

### Add Cash Advance
```
POST /api/employees/{employee_id}/cash-advances
```
Request body:
```json
{
  "amount": 5000,
  "reason": "Emergency expenses"
}
```

### Remove Cash Advance
```
DELETE /api/cash-advances/{cash_advance_id}
```
Only works for "Active" advances

### Apply Deduction
```
POST /api/payroll/{payroll_id}/apply-cash-advance
```
Request body:
```json
{
  "cash_advance_id": 1
}
```

## Service Methods

### CashAdvanceService

**createAdvance(employeeId, amount, reason, createdBy)**
- Creates a new cash advance with status "Active"
- Validates amount > 0
- Returns the created CashAdvance model

**deleteAdvance(advanceId)**
- Deletes a cash advance
- Only works for "Active" status
- Throws exception for other statuses

**applyDeduction(advanceId, payrollId)**
- Applies a deduction to payroll
- Creates PayrollItem with type "DEDUCTION"
- Updates advance status to "Deducted"
- Recalculates payroll totals

**getDeductibleAdvances(employeeId)**
- Returns only "Active" advances for an employee

**getRemainingAdvances(employeeId)**
- Returns "Active" and "Deducted" advances for an employee

**getTotalRemainingBalance(employeeId)**
- Returns sum of all "Active" and "Deducted" advances

## Testing

### Unit Tests
Run unit tests for CashAdvanceService:
```bash
php artisan test tests/Unit/CashAdvanceServiceTest.php
```

### Feature Tests
Run feature tests for payroll and payslip:
```bash
php artisan test tests/Feature/CashAdvancePayrollTest.php
php artisan test tests/Feature/CashAdvancePayslipTest.php
```

### Manual Testing Workflow

1. **Add Cash Advance**:
   - Go to Payroll Generation page
   - Select department and employee
   - Add a cash advance with amount and reason
   - Verify it appears in "Available to Deduct" table

2. **Apply Deduction**:
   - Click "Apply" on the cash advance
   - Verify status changes to "Deducted"
   - Verify PayrollItem is created
   - Verify payroll totals are recalculated

3. **View Payslip**:
   - Generate payroll
   - View payslip
   - Verify cash advance deduction appears
   - Verify remaining balance note appears (if applicable)

4. **Remove Advance**:
   - Add a new cash advance
   - Click "Remove" before applying deduction
   - Verify advance is deleted

## Troubleshooting

### Issue: Cannot remove a cash advance
**Solution**: Only "Active" advances can be removed. If the advance has been "Deducted" or "Completed", it cannot be removed.

### Issue: Payroll totals not updating after deduction
**Solution**: The system automatically recalculates totals. If not updating, verify the PayrollItem was created correctly.

### Issue: Remaining balance not showing on payslip
**Solution**: Remaining balance only shows if there are unpaid advances (Active or Deducted). If all advances are "Completed", no balance will show.

## Best Practices

1. **Always verify amounts**: Double-check cash advance amounts before applying deductions
2. **Document reasons**: Always include a reason for the cash advance for audit purposes
3. **Regular reconciliation**: Periodically review cash advances to ensure they're being properly deducted
4. **Hardcopy retention**: Keep hardcopy payslips for employee records
5. **Status tracking**: Monitor advance statuses to ensure proper workflow

## Compliance and Audit

- All cash advances are logged with:
  - Employee ID
  - Amount
  - Reason
  - Admin who created it
  - Creation date
  - Deduction date (if applicable)
- Payslips provide a complete audit trail of deductions
- Remaining balance tracking ensures no advances are forgotten

## Future Enhancements

Potential improvements for future versions:
- Employee request system (if needed)
- Automatic deduction scheduling
- Interest calculation for long-term advances
- Advance approval workflow
- Advance repayment tracking
