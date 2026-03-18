# Attendance-Payroll System Flow - Requirements Document

## Introduction

The Attendance-Payroll System Flow defines the complete workflow from processed attendance records through payroll generation and distribution. This system integrates with the Attendance Processing Enhancement system (which handles raw log processing, violation detection, and human review) to create a cohesive end-to-end process. The system manages payroll period management, payroll calculation with deductions, violation-based deductions, cash advance integration, and payslip generation. The system ensures accurate compensation calculation while maintaining compliance with company policies and labor regulations.

### Integration with Attendance Processing Enhancement

This spec builds upon the Attendance Processing Enhancement spec (.kiro/specs/attendance-processing-enhancement/requirements.md) which handles:
- Raw log import and parsing
- Intelligent auto-processing of attendance logs
- Violation detection and categorization
- Human review layer for ambiguous cases
- 4 subpages for attendance management (Attendance, Raw Logs, Violations, Review Queue)

The Attendance-Payroll System Flow assumes that attendance records have been processed and finalized through the Attendance Processing Enhancement system before payroll processing begins.

## Glossary

- **Attendance_Record**: A daily record of an employee's work hours, including clock-in/out times, late minutes, overtime, and undertime
- **Attendance_Violation**: A detected policy violation based on attendance patterns (e.g., AWOL, excessive lateness, unauthorized work)
- **Payroll_Period**: A defined time range (typically monthly) for which payroll is calculated and processed
- **Payroll**: An individual employee's calculated compensation for a payroll period
- **Payslip**: A detailed document showing an employee's earnings, deductions, and net pay for a payroll period
- **Gross_Pay**: Total earnings before deductions (basic pay + overtime)
- **Net_Pay**: Final amount employee receives (gross pay - all deductions)
- **Deduction**: Amount subtracted from gross pay (penalties, contributions, cash advances)
- **Cash_Advance**: A monetary advance provided to an employee against future salary
- **Violation_Deduction**: Salary deduction applied due to attendance violations (late penalties, undertime penalties)
- **Contribution**: Mandatory employee deductions (SSS, PhilHealth, Pag-IBIG)
- **Grace_Period**: Allowed late minutes before penalties apply
- **Payroll_Status**: Current state of payroll (DRAFT, FINALIZED, CLOSED)
- **System**: The Attendance-Payroll System Flow

## Requirements

### Requirement 1: Attendance Data Collection and Recording

**User Story:** As an HR administrator, I want to collect and record employee attendance data, so that I have accurate records for payroll calculation and compliance.

#### Acceptance Criteria

1. WHEN attendance logs are uploaded via CSV file, THE System SHALL parse and store them in the attendance_logs table
2. WHEN attendance logs are processed, THE System SHALL create attendance_records with calculated fields (time_in_am, time_out_lunch, time_in_pm, time_out_pm, late_minutes, overtime_minutes, undertime_minutes, rendered)
3. WHEN attendance records are created, THE System SHALL calculate rendered workday (1.0 for full day, 0.5 for half day, 0.0 for absent)
4. WHEN attendance records are created, THE System SHALL calculate late_minutes_am and late_minutes_pm based on grace period settings
5. WHEN attendance records are created, THE System SHALL calculate overtime_minutes for hours worked beyond scheduled time
6. WHEN attendance records are created, THE System SHALL calculate undertime_minutes for hours not worked within scheduled time
7. WHEN attendance records are created, THE System SHALL assign a status (Present, Half Day, Absent, Late, Undertime, etc.)
8. WHEN attendance records are created, THE System SHALL record remarks explaining the status and any special conditions

### Requirement 2: Violation Detection and Management

**User Story:** As an HR administrator, I want to detect and manage attendance violations, so that I can enforce company policies and ensure fair treatment.

#### Acceptance Criteria

1. WHEN attendance records are processed, THE System SHALL automatically detect violations based on configured rules
2. WHEN violations are detected, THE System SHALL create violation records with type, severity, and details
3. WHEN violations are detected, THE System SHALL store violation metadata for audit and reporting purposes
4. WHEN violations are reviewed, THE System SHALL allow administrators to update violation status (Pending, Reviewed, Letter Sent)
5. WHEN violations are reviewed, THE System SHALL allow administrators to add notes and dismiss violations
6. WHEN violations are dismissed, THE System SHALL exclude them from payroll deduction calculations
7. WHEN violations are detected, THE System SHALL categorize them by severity (Low, Medium, High, Critical)
8. WHEN violations are detected, THE System SHALL track cumulative violations for pattern detection (AWOL, excessive lateness, etc.)

### Requirement 3: Payroll Period Management

**User Story:** As an HR administrator, I want to create and manage payroll periods, so that I can organize payroll processing by defined time ranges.

#### Acceptance Criteria

1. WHEN an administrator creates a payroll period, THE System SHALL define start_date, end_date, and payroll_date
2. WHEN a payroll period is created, THE System SHALL assign it to a specific department
3. WHEN a payroll period is created, THE System SHALL set its status to OPEN
4. WHEN a payroll period is created, THE System SHALL validate that start_date is before end_date
5. WHEN a payroll period is created, THE System SHALL validate that payroll_date is after end_date
6. WHEN a payroll period is created, THE System SHALL prevent overlapping periods for the same department
7. WHEN a payroll period is open, THE System SHALL allow administrators to add, modify, or remove payroll records
8. WHEN a payroll period is finalized, THE System SHALL lock all payroll records and prevent further modifications
9. WHEN a payroll period is closed, THE System SHALL archive it and make it read-only

### Requirement 4: Payroll Calculation and Composition

**User Story:** As the system, I want to calculate accurate payroll based on attendance and deductions, so that employees receive correct compensation.

#### Acceptance Criteria

1. WHEN payroll is generated for an employee, THE System SHALL calculate basic_pay as (days_worked × daily_rate)
2. WHEN payroll is generated, THE System SHALL calculate overtime_pay as (overtime_minutes ÷ 60) × hourly_rate × 1.25
3. WHEN payroll is generated, THE System SHALL calculate gross_pay as basic_pay + overtime_pay
4. WHEN payroll is generated, THE System SHALL calculate late_penalty as (late_minutes ÷ 60) × hourly_rate
5. WHEN payroll is generated, THE System SHALL calculate undertime_penalty as (undertime_minutes ÷ 60) × hourly_rate
6. WHEN payroll is generated, THE System SHALL include employee contributions (SSS, PhilHealth, Pag-IBIG) as deductions
7. WHEN payroll is generated, THE System SHALL calculate total_deductions as sum of all deduction items
8. WHEN payroll is generated, THE System SHALL calculate net_pay as gross_pay - total_deductions
9. WHEN payroll is generated, THE System SHALL create payroll_items for each earning and deduction component
10. WHEN payroll is generated, THE System SHALL validate that net_pay is non-negative

### Requirement 5: Violation-Based Deductions

**User Story:** As the system, I want to apply deductions for attendance violations, so that policy violations are reflected in compensation.

#### Acceptance Criteria

1. WHEN payroll is generated, THE System SHALL identify active violations for the employee in the payroll period
2. WHEN violations are identified, THE System SHALL exclude dismissed violations from deduction calculations
3. WHEN violations are identified, THE System SHALL apply deductions only for violations with status "Reviewed" or "Letter Sent"
4. WHEN a cumulative grace period violation is identified, THE System SHALL calculate deductible_minutes as (total_late_minutes - grace_period_limit)
5. WHEN a cumulative grace period violation is identified, THE System SHALL apply deduction as (deductible_minutes ÷ 60) × hourly_rate
6. WHEN an unexcused absence violation is identified, THE System SHALL apply deduction as 1.0 × daily_rate (full day deduction)
7. WHEN an AWOL violation is identified, THE System SHALL apply deduction as 3.0 × daily_rate (three days deduction)
8. WHEN violations are applied to payroll, THE System SHALL create payroll_items with category "Violation Deduction" and reference the violation
9. WHEN violations are applied to payroll, THE System SHALL update the violation record to mark it as applied to payroll
10. WHEN payroll is finalized, THE System SHALL prevent further violation deduction modifications

### Requirement 6: Cash Advance Integration

**User Story:** As an HR administrator, I want to integrate cash advances into payroll, so that employees can repay advances from their salary.

#### Acceptance Criteria

1. WHEN payroll is being generated, THE System SHALL display active cash advances for the selected employee
2. WHEN an administrator selects a cash advance to deduct, THE System SHALL add it to the payroll deductions
3. WHEN a cash advance is deducted, THE System SHALL create a payroll_item with category "Cash Advance"
4. WHEN a cash advance is deducted, THE System SHALL update the cash_advance record status to "Deducted"
5. WHEN a cash advance is deducted, THE System SHALL record the deduction_date and payroll_period_id
6. WHEN multiple cash advances are deducted in one payroll period, THE System SHALL add each as a separate payroll_item
7. WHEN payroll is finalized, THE System SHALL update cash_advance status to "Completed" for deducted advances
8. WHEN a payslip is generated, THE System SHALL display cash advance deductions in the deductions section
9. WHEN a payslip is generated, THE System SHALL display remaining unpaid cash advance balance if applicable
10. WHEN payroll is generated, THE System SHALL prevent deduction of inactive cash advances

### Requirement 7: Payslip Generation

**User Story:** As an HR administrator, I want to generate payslips for employees, so that they have detailed records of their compensation.

#### Acceptance Criteria

1. WHEN payroll is finalized, THE System SHALL generate payslips for all employees in the payroll period
2. WHEN a payslip is generated, THE System SHALL include employee information (name, ID, department, position)
3. WHEN a payslip is generated, THE System SHALL include payroll period dates (start_date, end_date, payroll_date)
4. WHEN a payslip is generated, THE System SHALL include earnings breakdown (basic_pay, overtime_pay, other_earnings)
5. WHEN a payslip is generated, THE System SHALL include deductions breakdown (late_penalty, undertime_penalty, contributions, violation_deductions, cash_advances)
6. WHEN a payslip is generated, THE System SHALL display gross_pay, total_deductions, and net_pay prominently
7. WHEN a payslip is generated, THE System SHALL include attendance summary (days_worked, late_minutes, overtime_minutes, undertime_minutes)
8. WHEN a payslip is generated, THE System SHALL include violation details if violations were applied
9. WHEN a payslip is generated, THE System SHALL include cash advance deduction details and remaining balance
10. WHEN a payslip is generated, THE System SHALL be printable and suitable for hardcopy distribution

### Requirement 8: Payslip Distribution

**User Story:** As an HR administrator, I want to distribute payslips to employees, so that they receive their compensation details.

#### Acceptance Criteria

1. WHEN payslips are generated, THE System SHALL make them available for viewing by employees
2. WHEN payslips are generated, THE System SHALL allow administrators to print payslips for hardcopy distribution
3. WHEN payslips are printed, THE System SHALL include all required information in a professional format
4. WHEN payslips are printed, THE System SHALL support bulk printing of multiple payslips
5. WHEN payslips are distributed, THE System SHALL maintain a record of distribution date and method
6. WHEN payslips are viewed, THE System SHALL display them in a secure manner (employee can only view their own)
7. WHEN payslips are archived, THE System SHALL maintain historical records for audit purposes

### Requirement 9: Payroll Period Finalization

**User Story:** As an HR administrator, I want to finalize payroll periods, so that payroll is locked and ready for payment processing.

#### Acceptance Criteria

1. WHEN an administrator finalizes a payroll period, THE System SHALL lock all payroll records in the period
2. WHEN a payroll period is finalized, THE System SHALL prevent modifications to payroll records
3. WHEN a payroll period is finalized, THE System SHALL update all payroll statuses to FINALIZED
4. WHEN a payroll period is finalized, THE System SHALL update cash_advance statuses to COMPLETED for deducted advances
5. WHEN a payroll period is finalized, THE System SHALL generate payslips for all employees
6. WHEN a payroll period is finalized, THE System SHALL create an audit trail entry
7. WHEN a payroll period is finalized, THE System SHALL validate that all payroll records have valid net_pay values
8. WHEN a payroll period is finalized, THE System SHALL prevent further violation deductions from being applied

### Requirement 10: Payroll Review and Approval

**User Story:** As an HR administrator, I want to review payroll before finalization, so that I can ensure accuracy and compliance.

#### Acceptance Criteria

1. WHEN payroll is generated, THE System SHALL display a summary of total gross_pay, total_deductions, and total_net_pay
2. WHEN payroll is generated, THE System SHALL allow administrators to view individual payroll records
3. WHEN payroll is generated, THE System SHALL allow administrators to view individual payslips
4. WHEN payroll is generated, THE System SHALL allow administrators to regenerate payroll for specific employees
5. WHEN payroll is reviewed, THE System SHALL highlight any anomalies or unusual deductions
6. WHEN payroll is reviewed, THE System SHALL allow administrators to add notes to payroll records
7. WHEN payroll is reviewed, THE System SHALL provide a detailed breakdown of all calculations

### Requirement 11: Data Flow and Integration Points

**User Story:** As a system architect, I want clear data flow between attendance, violations, and payroll, so that the system is maintainable and accurate.

#### Acceptance Criteria

1. WHEN attendance records are created, THE System SHALL make them available for violation detection
2. WHEN violations are detected, THE System SHALL make them available for payroll deduction calculations
3. WHEN payroll is generated, THE System SHALL reference attendance records for calculation inputs
4. WHEN payroll is generated, THE System SHALL reference violation records for deduction inputs
5. WHEN payroll is generated, THE System SHALL reference cash_advance records for deduction inputs
6. WHEN payroll is finalized, THE System SHALL update related records (violations, cash_advances) to reflect completion
7. WHEN data is modified, THE System SHALL maintain referential integrity across all related records
8. WHEN data is queried, THE System SHALL provide efficient access through appropriate indexes

### Requirement 12: Reporting and Audit Trail

**User Story:** As an HR administrator, I want comprehensive reporting and audit trails, so that I can verify accuracy and compliance.

#### Acceptance Criteria

1. WHEN payroll is processed, THE System SHALL create audit trail entries for all significant actions
2. WHEN payroll is processed, THE System SHALL record who performed each action and when
3. WHEN payroll is processed, THE System SHALL record what changes were made to payroll records
4. WHEN payroll is processed, THE System SHALL allow administrators to view audit trails
5. WHEN payroll is processed, THE System SHALL generate reports showing payroll summary by department
6. WHEN payroll is processed, THE System SHALL generate reports showing deduction breakdown by type
7. WHEN payroll is processed, THE System SHALL generate reports showing violation impact on payroll
8. WHEN payroll is processed, THE System SHALL generate reports showing cash advance deductions

### Requirement 13: Error Handling and Validation

**User Story:** As the system, I want to validate data and handle errors gracefully, so that payroll accuracy is maintained.

#### Acceptance Criteria

1. WHEN payroll is generated, THE System SHALL validate that all required attendance records exist
2. WHEN payroll is generated, THE System SHALL validate that daily_rate is positive and non-zero
3. WHEN payroll is generated, THE System SHALL validate that calculated values are non-negative
4. WHEN payroll is generated, THE System SHALL validate that net_pay does not exceed gross_pay
5. WHEN payroll is generated, THE System SHALL validate that deductions do not exceed gross_pay
6. WHEN payroll is generated, THE System SHALL handle missing or incomplete attendance records gracefully
7. WHEN payroll is generated, THE System SHALL log all errors and validation failures
8. WHEN payroll is generated, THE System SHALL provide clear error messages to administrators

### Requirement 14: Performance and Scalability

**User Story:** As a system administrator, I want the payroll system to perform efficiently, so that processing large payrolls is fast.

#### Acceptance Criteria

1. WHEN payroll is generated for a department, THE System SHALL complete processing within reasonable time (< 5 minutes for 1000 employees)
2. WHEN payroll is generated, THE System SHALL use efficient database queries with appropriate indexes
3. WHEN payroll is generated, THE System SHALL batch process records to minimize memory usage
4. WHEN payroll is generated, THE System SHALL cache frequently accessed data (daily rates, contribution amounts)
5. WHEN payroll is generated, THE System SHALL support concurrent processing for multiple departments

### Requirement 15: Configuration and Customization

**User Story:** As an HR administrator, I want to configure payroll settings, so that the system adapts to company policies.

#### Acceptance Criteria

1. WHEN payroll is configured, THE System SHALL allow setting grace period limits per department
2. WHEN payroll is configured, THE System SHALL allow setting tracking periods (monthly, pay_period, rolling_30)
3. WHEN payroll is configured, THE System SHALL allow setting pay period dates and frequencies
4. WHEN payroll is configured, THE System SHALL allow setting daily rates per employee
5. WHEN payroll is configured, THE System SHALL allow setting contribution amounts per employee
6. WHEN payroll is configured, THE System SHALL allow enabling/disabling specific deduction types
7. WHEN payroll is configured, THE System SHALL allow setting violation deduction amounts
8. WHEN payroll is configured, THE System SHALL validate all configuration values before saving

### Requirement 16: System Interactions and Workflows

**User Story:** As an HR administrator, I want clear workflows for payroll processing, so that I can follow a consistent process.

#### Acceptance Criteria

1. WHEN processing payroll, THE System SHALL follow this workflow: Create Period → Generate Payroll → Review → Apply Violations → Apply Cash Advances → Finalize → Generate Payslips
2. WHEN processing payroll, THE System SHALL allow returning to previous steps if issues are identified
3. WHEN processing payroll, THE System SHALL prevent skipping required steps
4. WHEN processing payroll, THE System SHALL provide clear status indicators at each step
5. WHEN processing payroll, THE System SHALL allow administrators to save progress and resume later
6. WHEN processing payroll, THE System SHALL provide guidance and help at each step
7. WHEN processing payroll, THE System SHALL validate data at each step before proceeding

### Requirement 17: Compliance and Legal Requirements

**User Story:** As a compliance officer, I want the payroll system to comply with labor laws, so that the company meets legal obligations.

#### Acceptance Criteria

1. WHEN payroll is calculated, THE System SHALL comply with minimum wage requirements
2. WHEN payroll is calculated, THE System SHALL comply with overtime regulations (1.25x multiplier)
3. WHEN payroll is calculated, THE System SHALL comply with contribution requirements (SSS, PhilHealth, Pag-IBIG)
4. WHEN payroll is calculated, THE System SHALL maintain accurate records for audit purposes
5. WHEN payroll is calculated, THE System SHALL provide reports for government compliance (BIR, SSS, etc.)
6. WHEN payroll is calculated, THE System SHALL handle special cases (holidays, leaves) according to policy
7. WHEN payroll is calculated, THE System SHALL maintain data integrity and prevent unauthorized modifications

