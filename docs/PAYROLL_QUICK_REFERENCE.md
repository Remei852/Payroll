# Payroll System - Quick Reference Guide

## Quick Tasks

### Generate Payroll for a Period

1. Go to **Payroll** → **Generate**
2. Select **Department**
3. Set **Date From** and **Date To**
4. Set **Payroll Date** (when payroll is released)
5. Click **Generate**
6. Review warnings (if any) and click **Confirm**

### View Employee Payslip

1. Go to **Payroll** → **Periods**
2. Click on a payroll period
3. Find the employee in the list
4. Click on their name to view the payslip
5. Click **Print Payslip** to print or save as PDF

### Add Contributions to an Employee

1. Go to **Employees**
2. Click **Edit** on the employee
3. Go to **Contributions** tab
4. Click **Add**
5. Select contribution type
6. Enter amount
7. **Toggle to Active** (important!)
8. Click **Save Changes**

### Check if Contributions are Working

Run this command:

```bash
php artisan contributions:debug {employee_id}
```

Example:
```bash
php artisan contributions:debug 5
```

This shows:
- ✓ All contributions saved
- ✓ Which ones are active
- ✓ Calculated deduction amounts

### Regenerate Payroll for One Employee

1. Go to **Payroll** → **Periods**
2. Click on the period
3. Find the employee
4. Click **Regenerate** button
5. Payroll will be recalculated with latest data

## Common Scenarios

### Scenario: Payroll shows ₱0

**Cause**: Employee has zero daily rate

**Fix**:
1. Go to **Employees**
2. Edit the employee
3. Set a valid **Daily Rate** (e.g., ₱500)
4. Save
5. Regenerate payroll

### Scenario: Contributions not deducted

**Cause**: Contributions not marked as active

**Fix**:
1. Go to **Employees**
2. Edit the employee
3. Go to **Contributions** tab
4. Check if contributions show as "Active" (green)
5. If not, click the status button to toggle
6. Save
7. Regenerate payroll

### Scenario: Late/Undertime penalties not showing

**Cause**: No attendance records for the period

**Fix**:
1. Ensure attendance logs have been processed
2. Check **Attendance** → **Records** for the period
3. If no records, process attendance logs first
4. Then regenerate payroll

### Scenario: Wrong net pay calculation

**Cause**: Incorrect deductions or earnings

**Fix**:
1. View the payslip
2. Check **Detailed Breakdown** section
3. Verify:
   - Days worked
   - Hours worked
   - Overtime hours
   - Late/Undertime minutes
   - Contributions
4. If data is wrong, check attendance records
5. Regenerate payroll

## Payroll Calculation Formula

```
Gross Pay = (Days Worked × Daily Rate) + Overtime Pay

Total Deductions = Late Penalty + Undertime Penalty + Contributions

Net Pay = Gross Pay - Total Deductions
```

### Example Calculation

Employee: John Doe
- Daily Rate: ₱500
- Days Worked: 10 days
- Overtime: 5 hours (at 1.25x rate)
- Late: 30 minutes
- Contributions: SSS ₱500, PhilHealth ₱300

**Calculation**:
- Basic Pay = 10 × ₱500 = ₱5,000
- Hourly Rate = ₱500 ÷ 8 = ₱62.50
- Overtime Pay = 5 × ₱62.50 × 1.25 = ₱390.63
- Gross Pay = ₱5,000 + ₱390.63 = ₱5,390.63
- Late Penalty = 0.5 × ₱62.50 = ₱31.25
- Contributions = ₱500 + ₱300 = ₱800
- Total Deductions = ₱31.25 + ₱800 = ₱831.25
- **Net Pay = ₱5,390.63 - ₱831.25 = ₱4,559.38**

## Payroll Period Types

### Weekly (7 days)
- Contributions: 25% of monthly amount
- Example: SSS ₱500/month = ₱125/week

### Bi-monthly (15 days)
- Contributions: 50% of monthly amount
- Example: SSS ₱500/month = ₱250/bi-monthly

### Monthly (30 days)
- Contributions: 100% of monthly amount
- Example: SSS ₱500/month = ₱500/month

## Payslip Sections

### Earnings
- Basic Pay: Days worked × Daily Rate
- Overtime Pay: Overtime hours × Hourly Rate × 1.25

### Deductions
- Late Penalty: Late minutes ÷ 60 × Hourly Rate
- Undertime Penalty: Undertime minutes ÷ 60 × Hourly Rate
- Contributions: SSS, PhilHealth, Pag-IBIG, etc.

### Summary
- Gross Pay: Total earnings
- Total Deductions: Sum of all deductions
- Net Pay: Gross Pay - Total Deductions

## Useful Commands

### Debug Contributions
```bash
php artisan contributions:debug {employee_id}
```

### Debug Payroll Calculation
```bash
php artisan payroll:debug {employee_id} {period_id}
```

### Check Attendance Records
```bash
php artisan attendance:check {employee_id} {date}
```

## Tips

1. **Always verify daily rates** before generating payroll
2. **Mark contributions as Active** when adding them
3. **Check attendance records** are processed before payroll
4. **Regenerate payroll** after making changes to employee data
5. **Use the debug commands** to troubleshoot issues
6. **Print payslips** for employee records
7. **Finalize periods** when payroll is complete

## Support

For issues:
1. Run the appropriate debug command
2. Check the logs: `tail -f storage/logs/laravel.log`
3. Review this guide for common scenarios
4. Contact system administrator if needed
