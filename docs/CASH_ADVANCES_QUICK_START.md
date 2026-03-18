# Cash Advances - Quick Start Guide

## Overview
Cash advances are integrated into the payroll system. Admins can add cash advances to employees, which are then deducted from their payroll during the payroll generation process.

## Workflow

### Step 1: Generate Payroll Period
1. Go to **Payroll** → **Generate Payroll**
2. Select a department and date range
3. Click **Generate Payroll**
4. The system creates a payroll period with all employees

### Step 2: Manage Cash Advances
1. Click on the payroll period to view details
2. Go to the **Cash Advances** tab
3. You'll see:
   - **Add Cash Advance Form** - Add new advances to employees
   - **Employee Cash Advances Table** - View and manage advances

### Step 3: Add Cash Advance
1. Select an employee from the dropdown
2. Enter the amount (e.g., 1000)
3. Optionally enter a reason (e.g., "Emergency loan")
4. Click **Add**
5. The advance appears in the table under "Available"

### Step 4: Apply Deduction
1. In the "Available" column, click **Apply** next to the cash advance
2. The system deducts the amount from the employee's payroll
3. The advance moves to "Remaining" column (showing unpaid balance)

### Step 5: View Payslip
1. Click **View Payslip** to see the employee's payslip
2. The payslip shows:
   - Cash advance deduction in the deductions section
   - Remaining unpaid balance note at the bottom

### Step 6: Finalize Period
1. Once all cash advances are applied, click **Finalize Period**
2. The payroll is locked and ready for payment

## Key Features

### Cash Advance States
- **Active**: Newly added, can be applied or removed
- **Deducted**: Applied to payroll, cannot be removed
- **Completed**: Fully paid off (future state)

### Remaining Balance
- Shows total unpaid cash advances for each employee
- Updated when advances are applied
- Displayed on payslips for employee reference

### Validation
- Amount must be greater than 0
- Employee must be selected
- Reason is optional

## Common Tasks

### Remove a Cash Advance
1. In the "Available" column, click **Remove**
2. Confirm the deletion
3. The advance is deleted (only possible before applying)

### Check Employee's Total Advances
1. Look at the "Remaining" column
2. Shows total unpaid balance across all advances

### View Payslip Details
1. Click **View Payslip** button
2. Scroll to "Deductions" section to see cash advance deduction
3. Scroll to bottom to see "Remaining Balance" note

## Troubleshooting

### "Failed to add cash advance" Error
- Check that you selected an employee
- Check that you entered a valid amount (> 0)
- Check browser console for detailed error message

### "Failed to apply deduction" Error
- Ensure the advance is still in "Active" status
- Check that the payroll period is still "OPEN"
- Verify the employee exists in the payroll

### Advance Not Appearing in Table
- Refresh the page
- Check that the employee is in the current payroll period
- Verify you have admin privileges

## Notes

- Cash advances are employee-specific, not department-specific
- Multiple advances can be added to the same employee
- Advances persist across payroll periods until fully paid
- Deductions are applied per payroll period
- Payslips show both current deduction and remaining balance
