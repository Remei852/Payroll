# Payroll System Troubleshooting Guide

## Issue: No Employees Displayed in Payroll Period, All Totals Show Zero

### Root Causes

This issue typically occurs due to one or more of the following reasons:

#### 1. **Employees Have Zero Daily Rates** (Most Common)
- **Problem**: Employees are created with `daily_rate = 0` by default
- **Impact**: Payroll calculation: `0 × days_worked = 0` → All payroll amounts are zero
- **Solution**: Update employee daily rates before generating payroll

#### 2. **No Attendance Records for the Period**
- **Problem**: Attendance logs haven't been processed for the selected date range
- **Impact**: No attendance data means no days worked, resulting in zero payroll
- **Solution**: Process attendance logs first, then generate payroll

#### 3. **Incorrect Date Range**
- **Problem**: Selected payroll period doesn't match when attendance was recorded
- **Impact**: Payroll period has no matching attendance records
- **Solution**: Verify the date range includes dates with processed attendance

#### 4. **Contribution Issues**
- **Problem**: Employee contributions have incorrect field values
- **Impact**: Deductions may fail silently, affecting calculations
- **Solution**: Verify contribution amounts and types are properly configured

---

## Step-by-Step Troubleshooting

### Step 1: Verify Employee Daily Rates

1. Go to **Employees** page
2. Filter by the department you're generating payroll for (e.g., "Shop")
3. Check the **Daily Rate** column
4. If any employee shows **₱0.00**, they need to be updated:
   - Click **Edit** on the employee row
   - Go to **Basic Info** tab
   - Update the **Daily Rate** field with the correct wage
   - Click **Save**

**Example**: If an employee should earn ₱500/day, make sure the Daily Rate is set to 500.

### Step 2: Verify Attendance Records Exist

1. Go to **Attendance** → **Records**
2. Filter by the department and date range
3. Verify that employees have attendance records with:
   - **Rendered** days > 0 (days worked)
   - **Status** showing proper attendance data
   - Dates within your payroll period

If no records exist:
- Go to **Attendance** → **Logs**
- Process attendance logs for the required date range
- Wait for processing to complete
- Then generate payroll

### Step 3: Generate Payroll with Correct Parameters

1. Go to **Payroll** → **Generate**
2. Select the **Department**
3. Set **Period Start Date** and **Period End Date** to match your attendance records
4. Set **Payroll Date** (when employees will receive pay)
5. Click **Generate Payroll**

**Important**: The period dates must include dates where attendance was recorded.

### Step 4: Review Payroll Results

After generation, you should see:
- ✅ Employees listed in the payroll period table
- ✅ Gross Pay calculated (Days Worked × Daily Rate + Overtime)
- ✅ Deductions calculated (Late Penalty + Undertime Penalty + Contributions)
- ✅ Net Pay calculated (Gross Pay - Deductions)

If still showing zeros:
- Check the Laravel logs: `storage/logs/laravel.log`
- Look for "Payroll Calculation Debug" entries
- These will show the actual values being calculated

---

## Payroll Calculation Formula

```
Gross Pay = (Days Worked × Daily Rate) + Overtime Pay
Deductions = Late Penalty + Undertime Penalty + Contributions
Net Pay = Gross Pay - Deductions
```

### Component Breakdown

| Component | Calculation | Notes |
|-----------|-------------|-------|
| Days Worked | Sum of `rendered` from attendance records | 0.0 to 1.0 per day |
| Daily Rate | Employee's configured daily wage | Must be > 0 |
| Overtime Pay | (Overtime Hours × Hourly Rate × 1.25) | 1.25x multiplier |
| Late Penalty | (Late Minutes ÷ 60) × Hourly Rate | Deducted from pay |
| Undertime Penalty | (Undertime Minutes ÷ 60) × Hourly Rate | Deducted from pay |
| Contributions | Prorated based on pay period | Weekly=25%, Bi-monthly=50%, Monthly=100% |

---

## Debugging Commands

### Debug Payroll Calculation for a Specific Employee

```bash
php artisan payroll:debug {employee_id} {start_date} {end_date}
```

**Example**:
```bash
php artisan payroll:debug 1 2026-03-01 2026-03-15
```

This will show:
- Employee details (name, code, daily rate, department)
- All attendance records for the period
- Detailed calculation breakdown
- Earnings and deductions
- Final gross pay, deductions, and net pay

### Check Laravel Logs

```bash
tail -f storage/logs/laravel.log
```

Look for entries containing:
- "Payroll Generation Started"
- "Payroll Calculation Debug"
- "Payroll Generation Completed"
- "Payroll Generation Failed"

---

## Common Scenarios

### Scenario 1: Shop Department Payroll Shows Zero

**Symptoms**:
- No employees in payroll period table
- All totals show ₱0.00

**Solution**:
1. Go to Employees page
2. Filter by "Shop" department
3. Check each employee's Daily Rate
4. Update any with ₱0.00 to the correct wage
5. Regenerate payroll

### Scenario 2: Some Employees Missing from Payroll

**Symptoms**:
- Some employees appear, others don't
- Totals are lower than expected

**Solution**:
1. Check if missing employees have Daily Rate = 0
2. Check if missing employees have attendance records for the period
3. Check if missing employees have employment_status = "ACTIVE"
4. Update as needed and regenerate

### Scenario 3: Payroll Generated but Amounts Seem Wrong

**Symptoms**:
- Employees appear in payroll
- But amounts don't match expected calculations

**Solution**:
1. Use the debug command: `php artisan payroll:debug {employee_id} {start_date} {end_date}`
2. Verify the attendance records show correct rendered days
3. Verify the daily rate is correct
4. Check if contributions are being deducted
5. Review the detailed breakdown in the debug output

---

## Payslip Breakdown

When viewing a payslip, you'll see:

### Attendance Summary
- Days Worked
- Hours Worked (Days × 8)
- Overtime Hours
- Late Minutes/Hours
- Undertime Minutes/Hours

### Rates
- Daily Rate
- Hourly Rate (Daily Rate ÷ 8)

### Earnings
- Basic Pay (Days Worked × Daily Rate)
- Overtime Pay (if applicable)

### Deductions
- Late Penalty (if applicable)
- Undertime Penalty (if applicable)
- Contributions (SSS, PhilHealth, Pag-IBIG, etc.)

### Summary
- Total Earnings
- Total Deductions
- Net Pay (Earnings - Deductions)

---

## Prevention Tips

1. **Always update employee daily rates** before generating payroll
2. **Process attendance logs** for the required date range first
3. **Verify attendance records** exist before generating payroll
4. **Use the debug command** to verify calculations before finalizing
5. **Check logs** if anything seems incorrect
6. **Test with a small date range** first (e.g., 1-2 days) to verify setup

---

## Support

If you continue to experience issues:

1. Check the Laravel logs: `storage/logs/laravel.log`
2. Run the debug command for a specific employee
3. Verify all prerequisites are met (daily rates, attendance records)
4. Review this guide for your specific scenario
