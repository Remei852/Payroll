# Payroll System Documentation

## Overview
The payroll system manages employee wages, deductions, and cash advances across payroll periods.

## Key Features

### 1. Payroll Generation
- Create payroll periods for specific departments
- Define period dates and payroll payment date
- Automatic calculation of gross pay, deductions, and net pay
- Validation for employees with zero daily rates

### 2. Payroll Processing
- Calculate wages based on:
  - Days worked
  - Overtime hours
  - Late/undertime penalties
  - Contributions (SSS, PhilHealth, Pag-IBIG)
  - Cash advances

### 3. Cash Advances Management
- Three entry points for managing cash advances:
  1. **Payroll Period Page** (Primary) - Centralized management before finalization
  2. **Employee Profile** - Individual employee cash advance history
  3. **Payslip** (Read-only) - View deducted cash advances

### 4. Payslip Generation
- Professional payslip format with:
  - Employee information
  - Earnings breakdown
  - Deductions breakdown
  - Attendance summary
  - Print functionality

## Workflow

### Creating a Payroll Period
1. Navigate to Payroll → Generate Payroll
2. Select department
3. Set period dates (start and end)
4. Set payroll payment date
5. System validates employee daily rates
6. Click "Generate Payroll"

### Managing Cash Advances
1. Go to Payroll Period page
2. View summary cards (Pending, Approved, Total)
3. Click "Manage" on employee row to expand
4. Click "Add" to create new cash advance
5. Fill in amount, date, and purpose
6. Click "Approve" to approve pending requests
7. Finalize period to apply deductions

### Finalizing Payroll
1. Review all cash advances and deductions
2. Click "Finalize Period" button
3. System calculates final payslips
4. Payroll status changes to CLOSED

### Viewing Payslips
1. From Payroll Period page, click "View Payslip"
2. Review detailed breakdown
3. Print if needed

## Database Schema

### CashAdvance Model
- `id` - Primary key
- `employee_id` - Foreign key to Employee
- `payroll_period_id` - Foreign key to PayrollPeriod (nullable)
- `amount` - Decimal amount
- `date_requested` - Date requested
- `purpose` - Purpose of advance
- `notes` - Additional notes
- `status` - pending, approved, deducted, cancelled
- `timestamps` - created_at, updated_at

### PayrollItem Model
- Tracks individual earnings and deductions
- Types: EARNING, DEDUCTION
- Categories: Basic Pay, Overtime, Late Penalty, SSS, PhilHealth, Pag-IBIG, Cash Advance

## API Endpoints

### Cash Advances
- `POST /admin/cash-advances` - Create cash advance
- `POST /admin/cash-advances/{id}/approve` - Approve cash advance
- `POST /admin/cash-advances/{id}/cancel` - Cancel cash advance
- `DELETE /admin/cash-advances/{id}` - Delete cash advance

### Payroll
- `POST /admin/payroll/process-generation` - Generate payroll
- `POST /admin/payroll/{id}/finalize-period` - Finalize payroll period

## Components

### PayrollCashAdvances
- Displays cash advances management for payroll period
- Shows summary cards and employee table
- Allows adding, approving, and managing cash advances
- Located: `resources/js/Components/PayrollCashAdvances.jsx`

### CashAdvancesTab
- Employee profile cash advances tab
- Shows history and allows new requests
- Located: `resources/js/Components/CashAdvancesTab.jsx`

## Pages

### Payroll Index
- Lists all payroll periods
- Shows quick stats (total, closed, open)
- Pagination support
- Located: `resources/js/Pages/Payroll/Index.jsx`

### Payroll Generate
- Form to create new payroll period
- Validates employee daily rates
- Shows warnings for zero-rate employees
- Located: `resources/js/Pages/Payroll/Generate.jsx`

### Payroll Period
- Detailed view of payroll period
- Summary cards with totals
- Cash advances management section
- Employee payrolls table
- Finalize button
- Located: `resources/js/Pages/Payroll/Period.jsx`

### Payslip
- Professional payslip format
- Earnings and deductions breakdown
- Attendance summary
- Print functionality
- Info banner directing to Period page for cash advance changes
- Located: `resources/js/Pages/Payroll/Payslip.jsx`

## Services

### PayrollService
- Handles payroll calculations
- Includes cash advances in deductions
- Calculates gross pay, deductions, net pay
- Located: `app/Services/PayrollService.php`

### CashAdvanceService
- Manages cash advance operations
- Handles status transitions
- Located: `app/Services/CashAdvanceService.php`

## Important Notes

1. **Cash Advances Centralization**: All cash advance management should happen on the Payroll Period page for smooth processing
2. **Payslip Read-Only**: Payslips are read-only; changes to cash advances must be made on Period page
3. **Deduction Timing**: Cash advances are deducted when payroll period is finalized
4. **Status Flow**: pending → approved → deducted (or cancelled)

## Troubleshooting

### Zero Daily Rate Warning
- Appears when employees have ₱0.00 daily rate
- Update employee daily rates before generating payroll
- Navigate to Employee settings to update rates

### Cash Advance Not Showing in Payslip
- Ensure cash advance is approved before finalizing period
- Check that payroll period is finalized
- Verify cash advance status is "approved" or "deducted"

### Payroll Calculation Issues
- Verify attendance records are processed
- Check employee daily rates are set correctly
- Ensure contributions are configured
- Review PayrollService logs for calculation details
