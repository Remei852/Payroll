# Payslip Breakdown Guide

## Overview

The enhanced payslip now provides a comprehensive breakdown of employee compensation with detailed sections for attendance, earnings, and deductions (including contributions).

## Payslip Sections

### 1. Header Information
- **Employee Name**: Full name of the employee
- **Employee ID**: Unique employee code
- **Department**: Employee's department
- **Position**: Job title
- **Pay Period**: Start and end dates of the payroll period
- **Payroll Date**: When the employee will receive payment

### 2. Attendance Breakdown

This section shows detailed attendance information:

#### Days and Hours
- **Number of Days Worked**: Total days worked during the period
- **Total Hours Worked**: Days worked × 8 hours per day
- **Overtime Hours**: Additional hours worked beyond regular schedule (1.25x pay)

#### Absences and Delays
- **Late Minutes**: Total minutes employee was late
- **Late Hours**: Late minutes converted to hours
- **Undertime Minutes**: Total minutes of undertime
- **Undertime Hours**: Undertime minutes converted to hours

#### Rates
- **Daily Rate**: Employee's daily wage (configured in Employees section)
- **Hourly Rate**: Daily rate ÷ 8 hours

### 3. Detailed Breakdown

#### Attendance Summary
Shows a consolidated view of:
- Number of days worked
- Total hours worked
- Overtime hours
- Late minutes and hours
- Undertime minutes and hours

#### Rate Information
- Daily rate
- Hourly rate calculation

### 4. Earnings Section

Lists all earnings for the period:

**Basic Pay**
- Calculation: Days Worked × Daily Rate
- Example: 10 days × ₱500/day = ₱5,000

**Overtime Pay** (if applicable)
- Calculation: (Overtime Hours × Hourly Rate × 1.25)
- Example: 5 hours × ₱62.50/hour × 1.25 = ₱390.63

**Total Earnings**: Sum of all earnings

### 5. Deductions Section

Deductions are organized into two categories:

#### Penalties
- **Late Penalty**: Deduction for being late
  - Calculation: (Late Minutes ÷ 60) × Hourly Rate
  - Example: (30 minutes ÷ 60) × ₱62.50 = ₱31.25

- **Undertime Penalty**: Deduction for undertime
  - Calculation: (Undertime Minutes ÷ 60) × Hourly Rate
  - Example: (60 minutes ÷ 60) × ₱62.50 = ₱62.50

#### Contributions Deducted
All employee contributions are itemized and deducted:

- **SSS (Social Security System)**
  - Mandatory government contribution
  - Amount depends on salary bracket

- **PhilHealth (Philippine Health Insurance)**
  - Mandatory health insurance contribution
  - Percentage of salary

- **Pag-IBIG (Home Development Mutual Fund)**
  - Mandatory savings program
  - Fixed or percentage-based

- **Other Contributions**
  - Any additional deductions configured for the employee
  - Examples: Union dues, insurance, loans, etc.

**Contribution Proration**
Contributions are prorated based on pay period frequency:
- **Weekly (≤7 days)**: 25% of monthly contribution
- **Bi-monthly (8-16 days)**: 50% of monthly contribution
- **Monthly (17-31 days)**: 100% of monthly contribution

**Example**:
- Monthly SSS: ₱1,000
- Bi-monthly payroll: ₱1,000 × 50% = ₱500 deducted

**Total Deductions**: Sum of all penalties and contributions

### 6. Payment Summary

The final summary shows:

- **Gross Pay**: Basic Pay + Overtime Pay
  - Example: ₱5,000 + ₱390.63 = ₱5,390.63

- **Total Earnings**: All earnings combined
  - Example: ₱5,390.63

- **Total Deductions**: All penalties and contributions
  - Example: ₱31.25 (late) + ₱500 (SSS) + ₱250 (PhilHealth) + ₱100 (Pag-IBIG) = ₱881.25

- **Net Pay (Take-Home)**: Gross Pay - Total Deductions
  - Example: ₱5,390.63 - ₱881.25 = **₱4,509.38**

## Calculation Formula

```
Gross Pay = (Days Worked × Daily Rate) + Overtime Pay

Total Deductions = Late Penalty + Undertime Penalty + Contributions

Net Pay = Gross Pay - Total Deductions
```

## Example Payslip Calculation

**Employee**: Juan Dela Cruz
**Period**: March 1-15, 2026 (Bi-monthly)
**Daily Rate**: ₱500

### Attendance
- Days Worked: 10 days
- Hours Worked: 80 hours
- Overtime Hours: 5 hours
- Late Minutes: 30 minutes
- Undertime Minutes: 0 minutes

### Rates
- Daily Rate: ₱500
- Hourly Rate: ₱62.50

### Earnings
- Basic Pay: 10 × ₱500 = ₱5,000
- Overtime Pay: 5 × ₱62.50 × 1.25 = ₱390.63
- **Total Earnings: ₱5,390.63**

### Deductions
**Penalties:**
- Late Penalty: (30 ÷ 60) × ₱62.50 = ₱31.25

**Contributions (Bi-monthly - 50% of monthly):**
- SSS: ₱1,000 × 50% = ₱500
- PhilHealth: ₱500 × 50% = ₱250
- Pag-IBIG: ₱200 × 50% = ₱100

- **Total Deductions: ₱881.25**

### Summary
- Gross Pay: ₱5,390.63
- Total Earnings: ₱5,390.63
- Total Deductions: ₱881.25
- **Net Pay: ₱4,509.38** ← Amount employee receives

## Viewing the Payslip

1. Go to **Payroll** → **[Period Name]**
2. Find the employee in the table
3. Click **View Payslip**
4. Review all sections for accuracy

## Printing the Payslip

1. Open the payslip
2. Click **Print Payslip** button
3. Use your browser's print dialog
4. Select printer and print settings
5. Click Print

The payslip is formatted to print on standard A4 paper with all details visible.

## Understanding Contributions

### What are Contributions?

Contributions are mandatory or voluntary deductions from employee salaries for:
- Social security and insurance
- Savings programs
- Other benefits

### Common Contributions in the Philippines

| Contribution | Type | Purpose |
|---|---|---|
| SSS | Mandatory | Social security and retirement benefits |
| PhilHealth | Mandatory | Health insurance coverage |
| Pag-IBIG | Mandatory | Home loan and savings program |
| Union Dues | Voluntary | Labor union membership |
| Insurance | Voluntary | Additional health/life insurance |
| Loans | Voluntary | Employee loan repayment |

### How Contributions are Calculated

**Fixed Amount**
- Same amount every payroll period
- Example: ₱500 per month

**Percentage-Based**
- Calculated as percentage of basic pay
- Example: 5% of basic pay

**Prorated**
- Adjusted based on pay period frequency
- Monthly contributions divided for shorter periods

## Tips

1. **Review Regularly**: Check payslips to ensure accuracy
2. **Verify Contributions**: Confirm contribution amounts match agreements
3. **Track Deductions**: Keep records for tax purposes
4. **Ask Questions**: Contact HR if anything seems incorrect
5. **Print Copies**: Keep printed copies for your records

## Support

If you have questions about your payslip:
1. Review this guide
2. Check the Attendance Records page for attendance details
3. Contact your HR department
4. Review the Payroll Troubleshooting Guide

## Related Documents

- `docs/PAYROLL_QUICK_START.md` - Quick start guide
- `docs/PAYROLL_TROUBLESHOOTING.md` - Troubleshooting guide
- `docs/PAYROLL_FIX_SUMMARY.md` - System fixes and improvements
