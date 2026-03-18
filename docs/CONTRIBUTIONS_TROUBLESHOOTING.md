# Contributions Not Being Deducted - Troubleshooting Guide

## Status: ✅ RESOLVED

The contributions deduction system is now working correctly. See [CONTRIBUTIONS_RESOLUTION_SUMMARY.md](./CONTRIBUTIONS_RESOLUTION_SUMMARY.md) for complete details on how to use the system.

## Problem

Employee contributions are set in the Employees page but are not being deducted from the payroll.

## Root Causes

### 1. Contributions Not Marked as Active
**Problem**: Contributions are saved but `is_active` is set to `false`
**Solution**: 
- Go to Employees page
- Edit the employee
- Go to Contributions tab
- Ensure the toggle is ON (active) for each contribution
- Save changes

### 2. Contributions Not Saved Properly
**Problem**: Contributions tab shows no contributions
**Solution**:
- Go to Employees page
- Edit the employee
- Go to Contributions tab
- Add contributions:
  - Select contribution type (SSS, PhilHealth, Pag-IBIG, etc.)
  - Enter amount or rate
  - Toggle to active
  - Click Save

### 3. Contribution Type Not Linked
**Problem**: Contribution is saved but shows as "Unknown" in payslip
**Solution**:
- Verify the contribution type exists in the system
- Check that the contribution_type_id is correctly set
- Regenerate payroll after fixing

### 4. Calculation Type Mismatch
**Problem**: Contribution amount is incorrect
**Solution**:
- Check if contribution is FIXED or PERCENTAGE
- FIXED: Amount is deducted as-is
- PERCENTAGE: Amount is calculated as % of basic pay
- Verify the amount_or_rate value is correct

## Step-by-Step Verification

### Step 1: Check Employee Contributions in Database

Run this command to check if contributions are saved:

```bash
php artisan tinker
```

Then in the Tinker shell:

```php
$employee = App\Models\Employee::find(1); // Replace 1 with employee ID
$employee->contributions()->get();
```

You should see a list of contributions. If empty, contributions are not saved.

### Step 2: Check Contribution Status

```php
$employee = App\Models\Employee::find(1);
$employee->contributions()->where('is_active', true)->get();
```

If this returns empty but the previous query returned results, contributions are marked as inactive.

### Step 3: Check Contribution Type

```php
$contribution = App\Models\EmployeeContribution::find(1); // Replace with contribution ID
$contribution->contributionType;
```

If this returns null, the contribution type is not linked properly.

### Step 4: Check Payroll Logs

After generating payroll, check the logs:

```bash
tail -f storage/logs/laravel.log
```

Look for entries containing:
- "Contributions Debug" - Shows how many contributions were found
- "Contribution Calculation" - Shows the calculation details

## How to Add Contributions to an Employee

### Via Web Interface

1. Go to **Employees** page
2. Find the employee and click **Edit**
3. Go to **Contributions** tab
4. Click **Add Contribution Row**
5. Select contribution type from dropdown
6. Enter amount or rate
7. Toggle to active (ON)
8. Click **Save**

### Contribution Types

**Standard Contributions**:
- SSS (Social Security System)
- PhilHealth (Philippine Health Insurance)
- Pag-IBIG (Home Development Mutual Fund)

**Custom Contributions**:
- Union Dues
- Insurance
- Loans
- Other deductions

### Calculation Types

**FIXED**:
- Amount is deducted as-is every payroll
- Example: ₱500 fixed SSS contribution
- Prorated based on pay period

**PERCENTAGE**:
- Amount is calculated as percentage of basic pay
- Example: 5% of basic pay
- Prorated based on pay period

## Contribution Proration

Contributions are automatically prorated based on pay period:

| Period | Proration | Example |
|--------|-----------|---------|
| Weekly (≤7 days) | 25% | ₱1,000 monthly → ₱250 weekly |
| Bi-monthly (8-16 days) | 50% | ₱1,000 monthly → ₱500 bi-monthly |
| Monthly (17-31 days) | 100% | ₱1,000 monthly → ₱1,000 monthly |

## Debugging Steps

### Enable Debug Logging

The system now logs contribution calculations. Check logs after generating payroll:

```bash
tail -f storage/logs/laravel.log | grep "Contributions Debug"
```

This will show:
- How many contributions were found
- Contribution details (ID, type, amount, status)

### Check Contribution Calculation Logs

```bash
tail -f storage/logs/laravel.log | grep "Contribution Calculation"
```

This will show:
- Contribution type name
- Base amount
- Proration factor
- Final prorated amount

### Example Log Output

```
[2026-03-13 10:30:45] local.INFO: Contributions Debug {
  "employee_id": 1,
  "employee_name": "Juan Dela Cruz",
  "total_contributions": 3,
  "contributions": [
    {
      "id": 1,
      "type": 1,
      "calculation_type": "FIXED",
      "amount_or_rate": "500.0000",
      "is_active": true
    },
    {
      "id": 2,
      "type": 2,
      "calculation_type": "FIXED",
      "amount_or_rate": "250.0000",
      "is_active": true
    },
    {
      "id": 3,
      "type": 3,
      "calculation_type": "FIXED",
      "amount_or_rate": "100.0000",
      "is_active": true
    }
  ]
}
```

If `total_contributions` is 0, no contributions are being found.

## Common Issues and Solutions

### Issue 1: Contributions Show in Employee but Not in Payroll

**Cause**: Contributions are marked as inactive
**Solution**: 
1. Edit employee
2. Go to Contributions tab
3. Toggle each contribution to active
4. Save
5. Regenerate payroll

### Issue 2: Contributions Appear in Payroll but Amount is Wrong

**Cause**: Calculation type or amount is incorrect
**Solution**:
1. Edit employee
2. Go to Contributions tab
3. Verify calculation type (FIXED or PERCENTAGE)
4. Verify amount_or_rate value
5. Save
6. Regenerate payroll

### Issue 3: Contribution Type Shows as "Unknown"

**Cause**: Contribution type is not linked or deleted
**Solution**:
1. Check if contribution type exists
2. Delete the contribution and re-add it
3. Select the correct contribution type
4. Save
5. Regenerate payroll

### Issue 4: Contributions Not Saved When Editing Employee

**Cause**: Form validation error or save failed silently
**Solution**:
1. Check browser console for errors
2. Check Laravel logs for errors
3. Try adding one contribution at a time
4. Verify all required fields are filled
5. Save and refresh page to confirm

## Verification Checklist

Before generating payroll, verify:

- [ ] Employee has daily rate > 0
- [ ] Employee has contributions added
- [ ] All contributions are marked as active (toggle ON)
- [ ] Contribution types are correctly selected
- [ ] Amount or rate values are correct
- [ ] Calculation type is correct (FIXED or PERCENTAGE)
- [ ] Attendance records exist for the period
- [ ] Payroll period dates are correct

## Testing Contributions

### Test with Fixed Contribution

1. Add employee with daily rate ₱500
2. Add SSS contribution: FIXED, ₱500
3. Generate payroll for 10 days
4. Expected deduction: ₱500 (or prorated amount)

### Test with Percentage Contribution

1. Add employee with daily rate ₱500
2. Add contribution: PERCENTAGE, 5%
3. Generate payroll for 10 days (basic pay = ₱5,000)
4. Expected deduction: ₱250 (5% of ₱5,000, or prorated)

## Support

If contributions still don't appear:

1. Check the logs for "Contributions Debug" entries
2. Verify employee has contributions in database
3. Verify contributions are marked as active
4. Verify contribution types exist
5. Try regenerating payroll
6. Contact support with:
   - Employee ID
   - Contribution details
   - Log entries
   - Payroll period dates

## Related Documents

- `docs/PAYSLIP_BREAKDOWN_GUIDE.md` - Understanding payslip deductions
- `docs/PAYROLL_TROUBLESHOOTING.md` - General payroll troubleshooting
- `docs/PAYROLL_QUICK_START.md` - Quick start guide
