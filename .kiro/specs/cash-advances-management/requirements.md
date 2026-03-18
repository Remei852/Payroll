# Cash Advances Integration - Requirements Document

## Introduction

The Cash Advances Integration feature enables administrators to manage cash advance deductions as part of the payroll generation workflow. This feature integrates seamlessly into the existing payroll cycle (CSV upload → Attendance summary → Violation letters → Payroll generation), allowing admins to add and apply cash advance deductions directly during payroll creation without disrupting the main workflow.

## Glossary

- **Cash_Advance**: A monetary advance provided to an employee against their future salary
- **Deduction**: The amount subtracted from an employee's payslip to repay a cash advance
- **Advance_Status**: The current state of a cash advance (Active, Deducted, Completed)
- **Payroll_Period**: A defined time range for which payroll is calculated and processed
- **Payslip**: A detailed record of an employee's earnings and deductions for a payroll period
- **Payroll_Generation**: The process of creating payroll records for a specific period

## Requirements

### Requirement 1: Admin Cash Advance Creation

**User Story:** As an administrator, I want to add cash advances to employees, so that I can grant advances against their future salary.

#### Acceptance Criteria

1. WHEN an admin navigates to the cash advances management section, THE System SHALL display a form to add a cash advance to an employee
2. THE Add_Advance_Form SHALL require the following fields: Employee (required), Amount (required), Reason (optional)
3. WHEN an admin submits a form, THE System SHALL validate that the Amount is a positive number
4. WHEN an admin submits a valid form, THE System SHALL create a new cash advance record with status "Active"
5. WHEN a cash advance is created, THE System SHALL record the creation timestamp and the admin's ID
6. WHEN a cash advance is successfully created, THE System SHALL display a confirmation message to the admin

### Requirement 2: Admin Cash Advance Management

**User Story:** As an administrator, I want to view and manage all cash advances, so that I can track and control cash advance disbursement.

#### Acceptance Criteria

1. WHEN an admin navigates to the cash advances management section, THE System SHALL display a list of all cash advances
2. THE Advances_List SHALL display: Employee_Name, Employee_Code, Amount, Status, Date_Added, and Deduction_Status
3. THE Advances_List SHALL be filterable by Employee, Department, Status, and Date_Range
4. THE Advances_List SHALL be sortable by Employee_Name, Amount, and Date_Added
5. WHEN an admin clicks on a cash advance, THE System SHALL display the full advance details
6. WHEN an admin deletes a cash advance (only if not yet deducted), THE System SHALL remove it and display a confirmation message

### Requirement 4: Admin Cash Advance Deduction Application During Payroll

**User Story:** As an administrator, I want to apply cash advance deductions to employee payslips during payroll generation, so that employees repay their advances.

#### Acceptance Criteria

1. WHEN an admin is generating payroll for a payroll period, THE System SHALL display a section for adding cash advance deductions
2. WHEN an admin selects an employee during payroll generation, THE System SHALL display a list of active cash advances that have not yet been deducted
3. THE Deductible_Advances_List SHALL display: Cash_Advance_ID, Amount, and Date_Added
4. WHEN an admin selects an active cash advance to deduct, THE System SHALL add a deduction item to the employee's payroll
5. WHEN a deduction is added, THE System SHALL create a PayrollItem record with type "DEDUCTION", category "Cash Advance", and the advance amount
6. WHEN a deduction is added, THE System SHALL update the cash advance record's deduction status to "Applied"
7. WHEN a deduction is applied, THE System SHALL automatically recalculate the employee's total deductions and net pay
8. WHEN an admin applies multiple cash advance deductions to the same employee in one payroll period, THE System SHALL add each as a separate deduction item

### Requirement 5: Prevent Deduction of Inactive Advances

**User Story:** As the system, I want to ensure only active cash advances can be deducted, so that employees are not charged for removed advances.

#### Acceptance Criteria

1. WHEN an admin attempts to apply a cash advance deduction during payroll generation, THE System SHALL only display active cash advances
2. IF an admin attempts to manually add a deduction for an inactive cash advance, THEN THE System SHALL prevent the action and display an error message
3. WHEN a cash advance is deducted, THE System SHALL verify its status is "Active" before creating the deduction item

### Requirement 6: Track Deduction Application Date

**User Story:** As an administrator, I want to track when cash advance deductions are applied to payroll, so that I can audit the deduction process.

#### Acceptance Criteria

1. WHEN a cash advance deduction is applied to a payslip, THE System SHALL record the deduction application date
2. WHEN a payroll period is finalized, THE System SHALL update the cash advance record's deduction status to "Completed"
3. WHEN an admin views a cash advance record, THE System SHALL display the deduction application date and the payroll period it was applied to

### Requirement 7: Admin Cash Advance Balance Summary

**User Story:** As an administrator, I want to see a summary of employee cash advance balances, so that I can track total advances and deductions.

#### Acceptance Criteria

1. WHEN an admin views the cash advances list, THE System SHALL display for each employee: Total_Granted, Total_Deducted, and Pending_Deduction_Amount
2. THE Summary SHALL calculate Pending_Deduction_Amount as: Total_Granted - Total_Deducted
3. WHEN cash advance deductions are applied during payroll, THE System SHALL update the summary in real-time

