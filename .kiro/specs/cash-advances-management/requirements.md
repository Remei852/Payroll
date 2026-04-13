# Cash Advances Integration - Requirements Document

## Introduction

The Cash Advances Integration feature enables administrators to manage cash advances as part of the payroll generation workflow. Rather than a standalone feature, cash advances are integrated directly into the payroll generation process, allowing admins to add and apply cash advance deductions to employee payslips in a single, streamlined operation. This keeps the entire payroll cycle (upload CSV → review violations → generate payroll) smooth and efficient.

## Glossary

- **Cash_Advance**: A monetary advance provided to an employee against their future salary
- **Deduction**: The amount subtracted from an employee's payslip to repay a cash advance
- **Payroll_Period**: A defined time range for which payroll is calculated and processed
- **Payslip**: A detailed record of an employee's earnings and deductions for a payroll period
- **Payroll_Item**: A line item on a payslip representing earnings or deductions

## Requirements

### Requirement 1: Store Cash Advances in Database

**User Story:** As the system, I need to store cash advance records, so that advances can be tracked and applied during payroll.

#### Acceptance Criteria

1. WHEN an admin adds a cash advance to an employee, THE System SHALL create a cash advance record in the database
2. THE Cash_Advance record SHALL store: Employee_ID, Amount, Reason (optional), Status, Created_By, Created_At
3. WHEN a cash advance is created, THE System SHALL set its status to "Active"
4. WHEN a cash advance is deducted from payroll, THE System SHALL update its status to "Deducted"
5. THE System SHALL maintain a history of all cash advances for audit purposes

### Requirement 2: Add Cash Advances During Payroll Generation

**User Story:** As an administrator, I want to add cash advances to employees while generating payroll, so that I can manage advances as part of the payroll workflow.

#### Acceptance Criteria

1. WHEN an admin is on the payroll generation page and selects an employee, THE System SHALL display a section to add cash advances
2. THE Add_Advance_Section SHALL include fields for: Employee (pre-selected), Amount (required), Reason (optional)
3. WHEN an admin enters an amount and clicks "Add Advance", THE System SHALL validate that the amount is positive
4. WHEN a valid advance is added, THE System SHALL create the cash advance record and display it in the employee's advance list
5. WHEN an admin adds multiple advances to the same employee, THE System SHALL display all advances in a list
6. WHEN an admin removes an advance (before applying deduction), THE System SHALL delete it from the database

### Requirement 3: Apply Cash Advance Deductions to Payroll

**User Story:** As an administrator, I want to apply cash advance deductions to employee payslips during payroll generation, so that employees repay their advances.

#### Acceptance Criteria

1. WHEN an admin is generating payroll for an employee, THE System SHALL display all active cash advances for that employee
2. WHEN an admin selects an advance to deduct, THE System SHALL add a deduction item to the employee's payroll
3. WHEN a deduction is added, THE System SHALL create a PayrollItem record with type "DEDUCTION", category "Cash Advance", and the advance amount
4. WHEN a deduction is applied, THE System SHALL update the cash advance status to "Deducted"
5. WHEN a deduction is applied, THE System SHALL automatically recalculate the employee's total deductions and net pay
6. WHEN an admin applies multiple cash advance deductions to the same employee in one payroll period, THE System SHALL add each as a separate deduction item

### Requirement 4: Display Cash Advances on Payroll Generation Page

**User Story:** As an administrator, I want to see all cash advances for an employee on the payroll generation page, so that I can manage them efficiently without leaving the page.

#### Acceptance Criteria

1. WHEN an admin selects an employee on the payroll generation page, THE System SHALL display a "Cash Advances" section
2. THE Cash_Advances_Section SHALL show: Active advances list, Add advance form, and Apply deduction controls
3. THE Active_Advances_List SHALL display for each advance: Amount, Reason (if provided), Date_Added, and Action buttons (Apply/Remove)
4. WHEN an admin clicks "Apply" on an advance, THE System SHALL immediately add it as a deduction to the payroll
5. WHEN an admin clicks "Remove" on an advance (before applying), THE System SHALL delete it without affecting payroll

### Requirement 5: Display Cash Advances on Payslip

**User Story:** As an employee, I want to see cash advance deductions on my payslip, so that I can verify the repayment of my advances.

#### Acceptance Criteria

1. WHEN an employee views their payslip, THE System SHALL display all cash advance deductions in the deductions section
2. THE Deduction_Display SHALL show for each cash advance deduction: "Cash Advance" as the category, the deduction amount, and the advance reference
3. WHEN multiple cash advance deductions are applied in the same payroll period, THE System SHALL display each deduction separately
4. WHEN a payslip is printed, THE System SHALL include all cash advance deductions in the printed document

### Requirement 6: Prevent Deduction of Inactive Advances
### Requirement 7: Admin Cash Advance Balance Summary

**User Story:** As an administrator, I want to see a summary of employee cash advance balances, so that I can track total advances and deductions.

#### Acceptance Criteria

1. WHEN an admin views the cash advances list, THE System SHALL display for each employee: Total_Granted, Total_Deducted, and Pending_Deduction_Amount
2. THE Summary SHALL calculate Pending_Deduction_Amount as: Total_Granted - Total_Deducted
3. WHEN cash advance deductions are applied during payroll, THE System SHALL update the summary in real-time

### Requirement 8: Display Cash Advances on Printed Payslip

**User Story:** As the system, I need to display cash advance information on printed payslips, so that employees receive accurate hardcopy records.

#### Acceptance Criteria

1. WHEN a payslip is generated for printing, THE System SHALL include all cash advance deductions applied in the current payroll period in the deductions section
2. THE Printed_Payslip SHALL show for each cash advance deduction: "Cash Advance" as the category and the deduction amount
3. WHEN multiple cash advance deductions are applied in the same payroll period, THE System SHALL display each deduction separately on the printed payslip
4. WHEN a payslip is printed, THE System SHALL include a note showing any remaining unpaid cash advances (total amount still owed)
5. WHEN there are no remaining unpaid cash advances, THE System SHALL not display the remaining balance note
6. WHEN a payslip is printed, THE System SHALL ensure cash advance deductions and remaining balance information are clearly visible and accuratech deduction separately on the printed payslip
4. WHEN a payslip is printed, THE System SHALL ensure cash advance deductions are clearly visible and accurate

### Requirement 8: Admin Cash Advance Balance Summary

**User Story:** As an administrator, I want to see a summary of employee cash advance balances, so that I can track total advances and deductions.

#### Acceptance Criteria

1. WHEN an admin views the cash advances list, THE System SHALL display for each employee: Total_Granted, Total_Deducted, and Pending_Deduction_Amount
2. THE Summary SHALL calculate Pending_Deduction_Amount as: Total_Granted - Total_Deducted
3. WHEN cash advance deductions are applied during payroll, THE System SHALL update the summary in real-time
### Requirement 7: Track Deduction Application

**User Story:** As an administrator, I want to track when cash advance deductions are applied to payroll, so that I can audit the deduction process.

#### Acceptance Criteria

1. WHEN a cash advance deduction is applied to a payslip, THE System SHALL record the deduction application date
2. WHEN a payroll period is finalized, THE System SHALL update the cash advance record with the payroll period ID
3. WHEN an admin views a cash advance record, THE System SHALL display the deduction application date and the payroll period it was applied to

### Requirement 8: Maintain Payroll Calculation Accuracy

**User Story:** As the system, I want to ensure payroll calculations remain accurate when cash advances are applied, so that employees receive correct net pay.

#### Acceptance Criteria

1. WHEN a cash advance deduction is added to payroll, THE System SHALL recalculate total deductions
2. WHEN total deductions are recalculated, THE System SHALL recalculate net pay (Gross - Total_Deductions)
3. WHEN multiple deductions are applied, THE System SHALL ensure all calculations are accurate
4. WHEN payroll is finalized, THE System SHALL verify all deductions are correctly reflected in the final payslip

### Requirement 9: Provide Cash Advance Summary for Employees

**User Story:** As an employee, I want to see a summary of my cash advances on my payslip, so that I know how much has been deducted.

#### Acceptance Criteria

1. WHEN an employee views their payslip, THE System SHALL display a summary of cash advance deductions for that period
2. THE Summary SHALL show: Total_Cash_Advance_Deductions for the current payroll period
3. WHEN multiple cash advances are deducted in the same period, THE System SHALL sum them in the summary

### Requirement 10: Maintain Data Integrity

**User Story:** As the system, I want to maintain data integrity for cash advances, so that records are accurate and auditable.

#### Acceptance Criteria

1. WHEN a cash advance is created, THE System SHALL record the admin who created it
2. WHEN a cash advance is deducted, THE System SHALL record the deduction timestamp and payroll period
3. WHEN a cash advance is deleted, THE System SHALL only allow deletion if it has not been deducted
4. THE System SHALL prevent duplicate deductions of the same cash advance
