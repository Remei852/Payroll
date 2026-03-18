# Payroll System Documentation

## Overview

The payroll system calculates employee wages based on attendance records, applying the following formula:

```
Gross Pay = (Days Worked × Daily Rate) + Overtime Pay
Deductions = Late Penalty + Undertime Penalty + Contributions (SSS, PhilHealth, etc.)
Net Pay = Gross Pay - Deductions
```

## Database Structure

### Tables

1. **payroll_periods** - Defines payroll periods for departments
   - `department_id` - Department this period belongs to
   - `start_date` - Period start date
   - `end_date` - Period end date
   - `payroll_date` - Date when employees receive payment
   - `status` - OPEN, PROCESSING, or CLOSED

2. **payrolls** - Individual employee payroll records
   - `payroll_period_id` - Links to payroll period
   - `employee_id` - Employee this payroll is for
   - `gross_pay` - Basic pay + overtime
   - `total_earnings` - Sum of all earnings
   - `total_deductions` - Sum of all deductions
   - `net_pay` - Final amount employee receives
   - `status` - DRAFT or FINALIZED

3. **payroll_items** - Detailed breakdown of earnings and deductions
   - `payroll_id` - Links to payroll
   - `type` - EARNING or DEDUCTION
   - `category` - Basic Pay, Overtime, Late Penalty, SSS, etc.
   - `amount` - Item amount
   - `reference_id` - Optional reference to source record

## Calculation Logic

### Days Worked
- Based on `rendered` field in attendance_records
- `rendered` = 1.0 for full day, 0.5 for half day, 0.0 for absent
- Total days worked = Sum of all `rendered` values in period

### Overtime Pay
- Hourly Rate = Daily Rate ÷ 8 hours
- Overtime Pay = (Total Overtime Minutes ÷ 60) × Hourly Rate × 1.25
- 1.25x multiplier for overtime hours

### Late Penalty
- Late Penalty = (Total Late Minutes ÷ 60) × Hourly Rate
- Deducted from gross pay

### Undertime Penalty
- Undertime Penalty = (Total Undertime Minutes ÷ 60) × Hourly Rate
- Deducted from gross pay

### Contributions
- Employee contributions (SSS, PhilHealth, Pag-IBIG) from `employee_contributions` table
- Added as deduction items

## Workflow

### 1. Generate Payroll
1. Admin selects department and date range
2. System creates a `PayrollPeriod` record
3. For each active employee in department:
   - Fetch attendance records in date range
   - Calculate days worked, overtime, late, undertime
   - Calculate gross pay and deductions
   - Create `Payroll` record
   - Create `PayrollItem` records for each earning/deduction

### 2. Review Payroll
- Admin can view period details
- See all employees and their calculated pay
- View individual payslips
- Regenerate specific employee payroll if needed

### 3. Finalize Payroll
- Locks all payroll records (status → FINALIZED)
- Closes the period (status → CLOSED)
- No further edits allowed

## API Endpoints

### Payroll Management
- `GET /payroll` - List all payroll periods
- `GET /payroll/generate` - Show payroll generation form
- `POST /payroll/generate` - Process payroll generation
- `GET /payroll/period/{id}` - View period details
- `POST /payroll/period/{id}/finalize` - Finalize period
- `GET /payroll/payslip/{id}` - View employee payslip
- `POST /payroll/period/{periodId}/employee/{employeeId}/regenerate` - Regenerate employee payroll

## UI Pages

### 1. Payroll Index (`/payroll`)
- Lists all payroll periods
- Shows department, date range, status
- Link to generate new payroll

### 2. Generate Payroll (`/payroll/generate`)
- Form to create new payroll period
- Select department, date range, payroll date
- Triggers payroll calculation

### 3. Period Details (`/payroll/period/{id}`)
- Shows all employees in period
- Summary cards: Total Gross Pay, Deductions, Net Pay
- Table with employee payroll details
- Finalize button (if status is OPEN)

### 4. Payslip (`/payroll/payslip/{id}`)
- Detailed employee payslip
- Employee information
- Earnings breakdown
- Deductions breakdown
- Net pay calculation
- Print functionality

## Services

### PayrollService

**Methods:**
- `generatePayroll(PayrollPeriod $period)` - Generate payroll for all employees in period
- `generateEmployeePayroll(PayrollPeriod $period, Employee $employee)` - Generate payroll for single employee
- `calculatePayroll(Employee $employee, $attendanceRecords)` - Calculate payroll components
- `finalizePayroll(Payroll $payroll)` - Finalize single payroll
- `finalizePeriod(PayrollPeriod $period)` - Finalize entire period

## Models

### PayrollPeriod
- Relationships: `department()`, `payrolls()`
- Scopes: `open()`, `closed()`

### Payroll
- Relationships: `payrollPeriod()`, `employee()`, `items()`, `earnings()`, `deductions()`

### PayrollItem
- Relationship: `payroll()`

## Example Calculation

**Employee:** John Doe
**Daily Rate:** ₱500.00
**Period:** Jan 1-15, 2026 (15 days)

**Attendance Summary:**
- Days Worked: 13.5 days (13 full days + 1 half day)
- Overtime: 120 minutes (2 hours)
- Late: 90 minutes (1.5 hours)
- Undertime: 60 minutes (1 hour)

**Calculation:**
```
Hourly Rate = ₱500 ÷ 8 = ₱62.50

Basic Pay = 13.5 × ₱500 = ₱6,750.00
Overtime Pay = (120 ÷ 60) × ₱62.50 × 1.25 = ₱156.25
Gross Pay = ₱6,750.00 + ₱156.25 = ₱6,906.25

Late Penalty = (90 ÷ 60) × ₱62.50 = ₱93.75
Undertime Penalty = (60 ÷ 60) × ₱62.50 = ₱62.50
SSS Contribution = ₱200.00
PhilHealth = ₱150.00
Total Deductions = ₱506.25

Net Pay = ₱6,906.25 - ₱506.25 = ₱6,400.00
```

## Future Enhancements

1. **Tax Calculation** - Add withholding tax computation
2. **Allowances** - Support for meal, transportation allowances
3. **Bonuses** - 13th month pay, performance bonuses
4. **Loans** - Employee loan deductions
5. **Export** - Export payroll to Excel/CSV
6. **Email** - Send payslips via email
7. **Payroll Reports** - Summary reports, analytics
8. **Audit Trail** - Track all payroll changes
