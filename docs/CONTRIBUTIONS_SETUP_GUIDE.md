# Employee Contributions Setup Guide

## Overview

This guide explains how to properly set up and manage employee contributions (SSS, PhilHealth, Pag-IBIG, etc.) so they are correctly deducted from payroll.

## Quick Setup

### Step 1: Go to Employees Page
1. Click **Employees** in the sidebar
2. Find the employee
3. Click **Edit**

### Step 2: Add Contributions
1. Go to **Contributions** tab
2. Click **Add Contribution Row**
3. Select contribution type from dropdown
4. Enter amount or rate
5. Toggle to **ON** (active)
6. Click **Save**

### Step 3: Generate Payroll
1. Go to **Payroll** → **Generate**
2. Select department and dates
3. Click **Generate Payroll**
4. Contributions will be automatically deducted

## Contribution Types

### Standard Contributions

**SSS (Social Security System)**
- Mandatory government contribution
- Typical amount: ₱500-₱1,000/month
- Calculation type: FIXED

**PhilHealth (Philippine Health Insurance)**
- Mandatory health insurance
- Typical amount: ₱250-₱500/month
- Calculation type: FIXED

**Pag-IBIG (Home Development Mutual Fund)**
- Mandatory savings program
- Typical amount: ₱100-₱200/month
- Calculation type: FIXED

### Custom Contributions

You can add any custom contribution:
- Union Dues
- Insurance premiums
- Loan repayments
- Other deductions

## Calculation Types

### FIXED Amount
- Same amount every payroll period
- Example: ₱500 SSS every month
- Automatically prorated for shorter periods

**Example**:
- Monthly SSS: ₱500
- Bi-monthly payroll: ₱500 × 50% = ₱250 deducted

### PERCENTAGE
- Calculated as percentage of basic pay
- Example: 5% of daily rate × days worked
- Automatically prorated for shorter periods

**Example**:
- Contribution: 5% of basic pay
- Basic pay: ₱5,000
- Deduction: ₱5,000 × 5% = ₱250

## Step-by-Step Instructions

### Adding a Fixed Contribution

1. **Open Employee Edit**
   - Go to Employees page
   - Find employee
   - Click Edit

2. **Go to Contributions Tab**
   - Click the "Contributions" tab

3. **Add Contribution**
   - Click "Add Contribution Row"
   - Select "SSS" from dropdown
   - Enter amount: 500
   - Toggle to ON
   - Click Save

4. **Verify**
   - Refresh page
   - Contribution should appear in the list

### Adding a Percentage Contribution

1. **Open Employee Edit**
   - Go to Employees page
   - Find employee
   - Click Edit

2. **Go to Contributions Tab**
   - Click the "Contributions" tab

3. **Add Contribution**
   - Click "Add Contribution Row"
   - Select contribution type
   - Enter rate: 5 (for 5%)
   - Toggle to ON
   - Click Save

4. **Verify**
   - Refresh page
   - Contribution should appear in the list

## Troubleshooting

### Contributions Not Appearing in Payroll

**Check 1: Are contributions saved?**
```bash
php artisan contributions:debug {employee_id}
```

Replace `{employee_id}` with the employee's ID.

**Check 2: Are contributions marked as active?**
- Go to Employees page
- Edit employee
- Go to Contributions tab
- Verify toggle is ON for each contribution

**Check 3: Are contribution types correct?**
- Verify contribution type is selected from dropdown
- Don't leave it blank

**Check 4: Check logs**
```bash
tail -f storage/logs/laravel.log | grep "Contributions Debug"
```

### Contributions Showing Wrong Amount

**Verify calculation type**:
- FIXED: Amount is deducted as-is
- PERCENTAGE: Amount is calculated as % of basic pay

**Verify amount/rate value**:
- For FIXED: Enter the amount (e.g., 500)
- For PERCENTAGE: Enter the rate (e.g., 5 for 5%)

### Contribution Type Shows as "Unknown"

**Solution**:
1. Delete the contribution
2. Add it again
3. Select the correct type from dropdown
4. Save

## Contribution Proration

Contributions are automatically adjusted based on pay period length:

| Pay Period | Proration | Example |
|-----------|-----------|---------|
| Weekly (≤7 days) | 25% | ₱1,000 → ₱250 |
| Bi-monthly (8-16 days) | 50% | ₱1,000 → ₱500 |
| Monthly (17-31 days) | 100% | ₱1,000 → ₱1,000 |

**Example Calculation**:
- Employee: Juan Dela Cruz
- SSS Contribution: ₱500/month (FIXED)
- Payroll Period: March 1-15 (Bi-monthly)
- Deduction: ₱500 × 50% = ₱250

## Viewing Contributions in Payslip

When you view a payslip, contributions appear in the **Deductions** section:

```
Deductions
─────────────────────────
SSS Contribution        -₱250.00
PhilHealth Contribution -₱125.00
Pag-IBIG Contribution   -₱100.00
─────────────────────────
Total Deductions        -₱475.00
```

## Common Scenarios

### Scenario 1: New Employee with Standard Contributions

1. Create employee with daily rate ₱500
2. Add contributions:
   - SSS: ₱500 (FIXED)
   - PhilHealth: ₱250 (FIXED)
   - Pag-IBIG: ₱100 (FIXED)
3. Generate payroll
4. Contributions will be deducted (prorated if needed)

### Scenario 2: Employee with Percentage-Based Contribution

1. Create employee with daily rate ₱500
2. Add contribution:
   - Custom: 5% (PERCENTAGE)
3. Generate payroll for 10 days
4. Basic pay: ₱5,000
5. Deduction: ₱5,000 × 5% = ₱250

### Scenario 3: Employee with Loan Repayment

1. Create employee with daily rate ₱500
2. Add contribution:
   - Loan Repayment: ₱1,000 (FIXED)
3. Generate payroll
4. ₱1,000 will be deducted (or prorated)

## Best Practices

1. **Set contributions when creating employee**
   - Don't wait until payroll generation
   - Ensures consistent deductions

2. **Use FIXED for standard contributions**
   - SSS, PhilHealth, Pag-IBIG
   - Easier to manage and verify

3. **Use PERCENTAGE for flexible deductions**
   - Bonuses, incentives
   - Automatically scales with pay

4. **Verify before generating payroll**
   - Use `php artisan contributions:debug {id}`
   - Check that contributions are active
   - Confirm amounts are correct

5. **Keep records**
   - Document contribution setup
   - Track changes
   - Maintain audit trail

## Debugging Command

To check if contributions are properly configured:

```bash
php artisan contributions:debug {employee_id}
```

This will show:
- All contributions for the employee
- Which ones are active
- Calculation details
- Expected deduction amounts

## Support

If contributions are still not being deducted:

1. Run the debug command
2. Check the logs
3. Verify contributions are marked as active
4. Regenerate payroll
5. Check the payslip

## Related Documents

- `docs/CONTRIBUTIONS_TROUBLESHOOTING.md` - Troubleshooting guide
- `docs/PAYSLIP_BREAKDOWN_GUIDE.md` - Understanding payslip deductions
- `docs/PAYROLL_QUICK_START.md` - Quick start guide
