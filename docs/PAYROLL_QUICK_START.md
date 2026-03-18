# Payroll System Quick Start Guide

## Overview

The payroll system calculates employee wages based on:
- **Days worked** (from attendance records)
- **Daily rate** (configured per employee)
- **Overtime, late, and undertime** (from attendance records)
- **Contributions** (SSS, PhilHealth, Pag-IBIG, etc.)

## Prerequisites Checklist

Before generating payroll, ensure:

- [ ] All employees have **Daily Rate > 0** (not ₱0.00)
- [ ] Attendance logs have been **processed** for the date range
- [ ] Attendance records exist with **rendered days > 0**
- [ ] Employees have **employment_status = ACTIVE**
- [ ] Employees belong to the **correct department**

## Step 1: Update Employee Daily Rates

**Location**: Employees page

1. Click **Employees** in the sidebar
2. Filter by department (e.g., "Shop")
3. For each employee:
   - Click **Edit**
   - Go to **Basic Info** tab
   - Update **Daily Rate** field
   - Click **Save**

**Example**:
- Employee: Jay-ar Magdale
- Daily Rate: 500 (₱500/day)

## Step 2: Process Attendance Logs

**Location**: Attendance → Logs

1. Click **Attendance** → **Logs**
2. Select the date range
3. Click **Process Logs**
4. Wait for processing to complete
5. Verify records were created

## Step 3: Verify Attendance Records

**Location**: Attendance → Records

1. Click **Attendance** → **Records**
2. Filter by:
   - Department (e.g., "Shop")
   - Date range (same as payroll period)
3. Verify each employee has:
   - **Rendered** > 0 (days worked)
   - **Status** showing proper data
   - Dates within your payroll period

## Step 4: Generate Payroll

**Location**: Payroll → Generate

1. Click **Payroll** → **Generate**
2. Select **Department** (e.g., "Shop")
3. Set **Period Start Date** (e.g., 2026-03-01)
4. Set **Period End Date** (e.g., 2026-03-15)
5. Set **Payroll Date** (when employees receive pay)
6. Review any warnings about zero daily rates
7. Click **Generate Payroll**

**Important**: Period dates must match your attendance records!

## Step 5: Review Payroll Period

**Location**: Payroll → [Period Details]

After generation, you'll see:

- **Total Gross Pay**: Sum of all employee gross pay
- **Total Deductions**: Sum of all employee deductions
- **Total Net Pay**: Gross Pay - Deductions

For each employee:
- **Gross Pay**: (Days Worked × Daily Rate) + Overtime Pay
- **Deductions**: Late Penalty + Undertime Penalty + Contributions
- **Net Pay**: Gross Pay - Deductions

## Step 6: View Individual Payslips

**Location**: Payroll → [Period] → View Payslip

Click **View Payslip** for any employee to see:

### Attendance Summary
- Days Worked
- Hours Worked
- Overtime Hours
- Late Minutes/Hours
- Undertime Minutes/Hours

### Rates
- Daily Rate
- Hourly Rate

### Earnings
- Basic Pay
- Overtime Pay (if applicable)

### Deductions
- Late Penalty (if applicable)
- Undertime Penalty (if applicable)
- Contributions (itemized)

### Summary
- Total Earnings
- Total Deductions
- **Net Pay** (amount employee receives)

## Step 7: Finalize Payroll Period

**Location**: Payroll → [Period Details]

When ready to lock the payroll:

1. Review all payslips
2. Verify all amounts are correct
3. Click **Finalize Period**
4. Confirm the action
5. Period is now locked (cannot be edited)

## Common Issues & Quick Fixes

### Issue: No employees in payroll period

**Solution**:
1. Go to Employees page
2. Check if any have Daily Rate = ₱0.00
3. Update their daily rates
4. Regenerate payroll

### Issue: Payroll amounts are zero

**Solution**:
1. Verify employee daily rates are > 0
2. Verify attendance records exist for the period
3. Use debug command: `php artisan payroll:debug {employee_id} {start_date} {end_date}`

### Issue: Some employees missing

**Solution**:
1. Check if they have Daily Rate > 0
2. Check if they have attendance records for the period
3. Check if employment_status = ACTIVE
4. Update as needed and regenerate

## Payroll Calculation Formula

```
Gross Pay = (Days Worked × Daily Rate) + Overtime Pay

Deductions = Late Penalty + Undertime Penalty + Contributions

Net Pay = Gross Pay - Deductions
```

### Example Calculation

**Employee**: Jay-ar Magdale
- Daily Rate: ₱500
- Days Worked: 10
- Overtime Hours: 5
- Late Minutes: 30
- Contributions: ₱500

**Calculation**:
- Basic Pay = 10 × 500 = ₱5,000
- Hourly Rate = 500 ÷ 8 = ₱62.50
- Overtime Pay = 5 × 62.50 × 1.25 = ₱390.63
- Gross Pay = 5,000 + 390.63 = ₱5,390.63

- Late Penalty = (30 ÷ 60) × 62.50 = ₱31.25
- Contributions = ₱500
- Total Deductions = 31.25 + 500 = ₱531.25

- **Net Pay = 5,390.63 - 531.25 = ₱4,859.38**

## Contribution Proration

Contributions are prorated based on pay period frequency:

| Period Length | Proration | Example |
|---------------|-----------|---------|
| Weekly (≤7 days) | 25% | Monthly ₱1,000 → Weekly ₱250 |
| Bi-monthly (8-16 days) | 50% | Monthly ₱1,000 → Bi-monthly ₱500 |
| Monthly (17-31 days) | 100% | Monthly ₱1,000 → Monthly ₱1,000 |

## Tips for Success

1. **Always update daily rates first** - This is the most common issue
2. **Process attendance logs** before generating payroll
3. **Use the same date range** for both attendance and payroll period
4. **Review warnings** on the Generate page
5. **Test with a small period** (1-2 days) first
6. **Use the debug command** to verify calculations
7. **Check logs** if anything seems wrong: `tail -f storage/logs/laravel.log`

## Debugging

### View Payroll Calculation Details

```bash
php artisan payroll:debug {employee_id} {start_date} {end_date}
```

**Example**:
```bash
php artisan payroll:debug 1 2026-03-01 2026-03-15
```

This shows:
- Employee details
- All attendance records
- Detailed calculation breakdown
- Earnings and deductions
- Final amounts

### Check Application Logs

```bash
tail -f storage/logs/laravel.log
```

Look for:
- "Payroll Generation Started"
- "Payroll Calculation Debug"
- "Payroll Generation Completed"
- "Payroll Generation Failed"

## Support Resources

- **Troubleshooting Guide**: See `docs/PAYROLL_TROUBLESHOOTING.md`
- **Fix Summary**: See `docs/PAYROLL_FIX_SUMMARY.md`
- **System Documentation**: See `docs/PAYROLL_SYSTEM.md`

## Next Steps

1. ✅ Update employee daily rates
2. ✅ Process attendance logs
3. ✅ Generate payroll
4. ✅ Review payslips
5. ✅ Finalize period
