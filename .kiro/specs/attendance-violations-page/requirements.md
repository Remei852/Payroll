# Requirements Document

## Introduction

The Attendance Violations Page provides administrators with a centralized view of employee attendance policy violations. The system automatically detects and displays violations including cumulative grace period exceeded, unexcused absences, AWOL (abandonment of work), biometrics policy violations, missing logs, excessive log patterns, unauthorized work days, excessive undertime, and frequent half-days. 

The grace period is tracked per calendar month regardless of pay period frequency (weekly, bi-weekly, monthly). All employees have a default 60-minute grace period per calendar month. When an employee exceeds this monthly allowance, a violation is triggered immediately to notify administrators to prepare salary deductions and hand violation notices to employees. Salary deductions apply to all late minutes exceeding the 60-minute threshold.

Administrators can configure grace period tracking policies per department to accommodate different branch requirements and operating hours. Administrators print violation notices to hand to employees. Employees can verify their logs in the separate "Lilo" system if they dispute the notice. This page is admin-only; employees do not have access to view violations here.

## Glossary

- **Attendance_Violations_Page**: The web interface displaying detected attendance violations (admin-only access)
- **Violation_Record**: A database entry in the attendance_violations table representing a detected policy violation
- **Admin_User**: A user with administrative privileges who can view and manage violations
- **Violation_Type**: The category of violation (Cumulative Grace Period Exceeded, Unexcused Absence, AWOL, Biometrics Policy Violation, Missing Logs, Excessive Logs, Unauthorized Work, Excessive Undertime, Frequent Half Day)
- **Severity_Level**: The classification of violation impact (Low, Medium, High, Critical)
- **Violation_Status**: The processing state of a violation (Pending, Reviewed, Letter Sent)
- **Attendance_Record**: A database entry tracking daily attendance data including late minutes, status, and logs
- **Detection_System**: The backend service that identifies violations from attendance records
- **Filter_Component**: UI controls for narrowing violation display by criteria
- **Violation_Details_Modal**: A popup displaying comprehensive information about a specific violation
- **Settings_Page**: The administrative interface for configuring system policies and rules
- **Cumulative_Grace_Period**: The configurable total allowance for late arrivals per employee per calendar month (default: 60 minutes per month, independent of pay period frequency)
- **Deductible_Minutes**: The late minutes exceeding the grace period limit that are subject to salary deduction
- **Pay_Period**: The recurring time interval used for payroll calculation and salary payment timing (e.g., bi-weekly, semi-monthly) - does NOT affect grace period calculation which is always monthly
- **Department_Grace_Period_Settings**: Configuration for grace period tracking specific to each department
- **Pay_Period_Configuration**: Department-specific pay period start date and frequency for payroll reference purposes only
- **Excessive_Logs**: A violation type indicating an employee has more than 4 attendance logs on a single day
- **Lilo_System**: The separate system where employees can verify their attendance logs
- **Violation_Notes**: Text field storing admin comments about violation context and explanations
- **Dismiss_Violation**: Action to remove a violation record from the system after manual review

## Database Schema

The attendance_violations table includes the following fields:
- `id`: Primary key
- `employee_id`: Foreign key to employees table
- `violation_date`: Date when the violation occurred
- `violation_type`: Type of violation (enum)
- `severity_level`: Severity classification (Low, Medium, High, Critical)
- `status`: Current processing state (Pending, Reviewed, Letter Sent)
- `details`: Text description of the violation
- `metadata`: JSON field storing additional violation-specific data
- `notes`: TEXT field storing admin comments about the violation context (nullable)
- `dismissed_at`: TIMESTAMP when the violation was dismissed (nullable)
- `dismissed_by`: Foreign key to users table indicating which admin dismissed the violation (nullable)
- `created_at`: Timestamp when the violation was created
- `updated_at`: Timestamp when the violation was last modified

## Requirements

### Requirement 1: Display Violation List

**User Story:** As an admin, I want to view a list of all attendance violations, so that I can monitor employee compliance with attendance policies

#### Acceptance Criteria

1. WHEN the Attendance_Violations_Page loads, THE System SHALL retrieve all Violation_Records from the database
2. THE Attendance_Violations_Page SHALL display employee name, violation date, violation type, severity level, and status for each Violation_Record
3. THE Attendance_Violations_Page SHALL sort Violation_Records by violation date in descending order by default
4. WHEN a Violation_Record has severity level Critical, THE Attendance_Violations_Page SHALL display it with a dark red visual indicator
5. WHEN a Violation_Record has severity level High, THE Attendance_Violations_Page SHALL display it with a red visual indicator
6. WHEN a Violation_Record has severity level Medium, THE Attendance_Violations_Page SHALL display it with a yellow visual indicator
7. WHEN a Violation_Record has severity level Low, THE Attendance_Violations_Page SHALL display it with a blue visual indicator

### Requirement 2: Filter Violations

**User Story:** As an admin, I want to filter violations by various criteria, so that I can focus on specific types of issues or employees

#### Acceptance Criteria

1. THE Filter_Component SHALL provide options to filter by employee name
2. THE Filter_Component SHALL provide options to filter by violation type
3. THE Filter_Component SHALL provide options to filter by severity level
4. THE Filter_Component SHALL provide options to filter by status
5. THE Filter_Component SHALL provide options to filter by date range
6. WHEN filter criteria are applied, THE Attendance_Violations_Page SHALL display only Violation_Records matching all selected criteria
7. WHEN filter criteria are cleared, THE Attendance_Violations_Page SHALL display all Violation_Records

### Requirement 3: View Violation Details

**User Story:** As an admin, I want to view detailed information about a specific violation, so that I can understand the context and make informed decisions

#### Acceptance Criteria

1. WHEN an admin clicks on a Violation_Record, THE System SHALL open the Violation_Details_Modal
2. THE Violation_Details_Modal SHALL display the employee name and employee ID
3. THE Violation_Details_Modal SHALL display the violation date and violation type
4. THE Violation_Details_Modal SHALL display the severity level and current status
5. THE Violation_Details_Modal SHALL display the details field content from the Violation_Record
6. THE Violation_Details_Modal SHALL display the metadata field content in a readable format
7. THE Violation_Details_Modal SHALL display the notes field content if notes exist for the Violation_Record
8. WHEN the Violation_Type is Cumulative Grace Period Exceeded, THE Violation_Details_Modal SHALL display total late minutes, grace period used, grace period limit, deductible minutes (total minus grace period limit), and calculation breakdown showing that salary deduction will be applied for minutes exceeding the grace period limit
9. WHEN the Violation_Type is AWOL, THE Violation_Details_Modal SHALL display the three consecutive absence dates
10. WHEN the Violation_Type is Biometrics Policy Violation, THE Violation_Details_Modal SHALL display which timestamps are missing
11. WHEN the Violation_Type is Excessive Logs, THE Violation_Details_Modal SHALL display the total log count and all log timestamps

### Requirement 4: Update Violation Status

**User Story:** As an admin, I want to update the status of violations, so that I can track which violations have been addressed

#### Acceptance Criteria

1. THE Violation_Details_Modal SHALL provide a dropdown to change the Violation_Status
2. THE Violation_Status dropdown SHALL include options: Pending, Reviewed, Letter Sent
3. WHEN an admin selects a new status, THE System SHALL update the Violation_Record in the database
4. WHEN the status update succeeds, THE System SHALL display a success notification
5. WHEN the status update fails, THE System SHALL display an error message with the failure reason
6. WHEN the status is updated, THE Attendance_Violations_Page SHALL refresh to show the updated status

### Requirement 5: Add Notes to Violation

**User Story:** As an admin, I want to add notes to violations explaining the context, so that I can document why absences occurred and maintain an audit trail

#### Acceptance Criteria

1. THE Violation_Details_Modal SHALL provide a text area for adding or editing Violation_Notes
2. THE Violation_Details_Modal SHALL display existing Violation_Notes if they exist for the Violation_Record
3. WHEN an admin enters or modifies text in the notes field, THE System SHALL enable a save button
4. WHEN the save button is clicked, THE System SHALL update the notes field in the Violation_Record
5. WHEN the notes update succeeds, THE System SHALL display a success notification
6. WHEN the notes update fails, THE System SHALL display an error message with the failure reason
7. THE notes text area SHALL support multi-line text input
8. THE notes field SHALL accept up to 2000 characters
9. WHEN notes are added to a Violation_Record, THE printable violation notice SHALL include the notes content
10. WHEN notes exist for a Violation_Record, THE CSV export SHALL include the notes in a dedicated column

### Requirement 6: Dismiss Violation

**User Story:** As an admin, I want to dismiss violations that are actually excused absences, so that I can remove false positives from the violations list while maintaining an audit trail

#### Acceptance Criteria

1. THE Violation_Details_Modal SHALL provide a dismiss button
2. WHEN the dismiss button is clicked, THE System SHALL display a confirmation dialog
3. THE confirmation dialog SHALL state "Are you sure you want to dismiss this violation? This action will remove it from the violations list."
4. THE confirmation dialog SHALL provide Cancel and Confirm options
5. WHEN the admin clicks Cancel, THE System SHALL close the confirmation dialog without changes
6. WHEN the admin clicks Confirm, THE System SHALL update the Violation_Record with dismissed_at timestamp and dismissed_by user ID
7. WHEN the dismissal succeeds, THE System SHALL display a success notification
8. WHEN the dismissal succeeds, THE System SHALL close the Violation_Details_Modal
9. WHEN the dismissal succeeds, THE System SHALL remove the dismissed Violation_Record from the Attendance_Violations_Page display
10. WHEN the dismissal fails, THE System SHALL display an error message with the failure reason
11. THE System SHALL maintain dismissed Violation_Records in the database for audit purposes
12. THE System SHALL exclude dismissed Violation_Records from the default violations list query
13. WHEN an admin has appropriate permissions, THE System SHALL allow viewing dismissed violations through a separate filter option

### Requirement 7: Detect Cumulative Grace Period Exceeded

**User Story:** As an admin, I want the system to automatically detect when an employee exceeds their cumulative grace period, so that I can generate violation notices and prepare salary deductions

#### Acceptance Criteria

1. WHEN cumulative grace period tracking is enabled in the employee's department settings, THE Detection_System SHALL monitor employee late minutes within the configured tracking period
2. WHEN the sum of late_minutes_am and late_minutes_pm for an employee within the tracking period reaches or exceeds the grace period limit configured for their department, THE Detection_System SHALL create a Violation_Record with type Cumulative Grace Period Exceeded immediately on the day the threshold is crossed
3. THE Detection_System SHALL use the Department_Grace_Period_Settings for the employee's assigned department
4. WHEN the employee's department has cumulative tracking disabled, THE Detection_System SHALL NOT create Cumulative Grace Period Exceeded violations for that employee
5. WHEN the employee's department has no specific configuration, THE Detection_System SHALL use system default settings with cumulative tracking disabled
6. WHEN the tracking period is Monthly, THE Detection_System SHALL calculate totals within calendar months
7. WHEN the tracking period is Pay Period, THE Detection_System SHALL calculate totals based on the Pay_Period_Configuration for the employee's department
8. WHEN the tracking period is Rolling 30 Days, THE Detection_System SHALL calculate totals within a 30-day window from the current date
9. THE Detection_System SHALL set severity level to High for this Violation_Type
10. THE Detection_System SHALL store the total late minutes, affected dates, tracking period, and department configuration used in the metadata field
11. THE Detection_System SHALL calculate the total by summing all Attendance_Records where late_minutes_am greater than 0 or late_minutes_pm greater than 0 within the tracking period
12. WHEN the Cumulative_Grace_Period is exceeded, THE Violation_Record details field SHALL include the total late minutes, grace period used, grace period limit, deductible minutes (total late minutes minus grace period limit), and a breakdown showing that salary deduction will be applied for minutes exceeding the grace period limit
13. THE Violation_Record metadata field SHALL include a breakdown showing: grace period used, grace period limit, excess minutes subject to deduction, and all dates contributing to the total
14. THE Detection_System SHALL run daily after attendance processing to detect threshold crossings immediately
15. THE first 60 minutes of late time in a calendar month SHALL result in no salary deduction
16. WHEN an employee exceeds 60 minutes total late time in a calendar month, THE salary deduction SHALL apply to all late minutes after the 60-minute threshold
17. WHEN an employee has additional late time after exceeding the threshold, THE salary deduction SHALL apply immediately to those additional minutes

**Example Scenario:**
```
Month: January 2026
Week 1: Late 20 minutes → Total: 20/60 → No deduction, no violation
Week 2: Late 25 minutes → Total: 45/60 → No deduction, no violation
Week 3: Late 30 minutes → Total: 75/60 → VIOLATION CREATED
        → Deductible minutes: 15 (75 - 60)
        → Salary deduction: 15 minutes
Week 4: Late 10 minutes → Total: 85/60 → Deductible minutes: 25 (85 - 60)
        → Additional salary deduction: 10 minutes
```

### Requirement 8: Detect Unexcused Absences

**User Story:** As an admin, I want the system to automatically detect unexcused absences, so that I can enforce absence policies and payroll deductions

#### Acceptance Criteria

1. WHEN an employee has an Attendance_Record with status Absent (not Absent - Excused), THE Detection_System SHALL create a Violation_Record with type Unexcused Absence
2. THE Detection_System SHALL set severity level to High for this Violation_Type
3. THE Violation_Record details field SHALL state that the absence results in no pay for the day and potential short suspension
4. THE Detection_System SHALL store the absence date and any available context in the metadata field
5. THE Detection_System SHALL distinguish between status Absent and status Absent - Excused when detecting violations
6. THE System SHALL default all absences to Unexcused Absence violations since the biometric CSV does not indicate excused status
7. WHEN an absence is actually excused (approved leave, sick leave, etc.), THE Admin_User SHALL add notes explaining the context and dismiss the violation

### Requirement 9: Detect AWOL (Abandonment of Work)

**User Story:** As an admin, I want the system to automatically detect AWOL situations, so that I can initiate due process for potential termination

#### Acceptance Criteria

1. WHEN an employee has 3 consecutive Attendance_Records with status Absent without notification to supervisor, THE Detection_System SHALL create a Violation_Record with type AWOL
2. THE Detection_System SHALL set severity level to Critical for this Violation_Type
3. THE Violation_Record details field SHALL state that AWOL constitutes neglect of duty and just cause for termination after due process
4. THE Detection_System SHALL store the three consecutive absence dates in the metadata field
5. THE Detection_System SHALL verify that the absences are consecutive calendar days (excluding weekends and holidays based on employee schedule)

### Requirement 10: Detect Biometrics Policy Violations

**User Story:** As an admin, I want the system to automatically detect biometrics policy violations, so that I can enforce proper time tracking procedures

#### Acceptance Criteria

1. WHEN an employee has an Attendance_Record with null time_in_am or null time_out_pm, THE Detection_System SHALL create a Violation_Record with type Biometrics Policy Violation
2. THE Detection_System SHALL set severity level to Medium for this Violation_Type
3. THE Violation_Record details field SHALL state that missing biometric entries result in the day being considered absent and logbook entries are not honored by HR
4. THE Detection_System SHALL store the date and which timestamps are missing (time_in_am, time_out_pm, or both) in the metadata field
5. WHEN both time_in_am and time_out_pm are null, THE Detection_System SHALL set severity level to High

### Requirement 11: Detect Missing Logs

**User Story:** As an admin, I want the system to automatically detect employees with frequent missing logs, so that I can ensure proper time tracking

#### Acceptance Criteria

1. WHEN an employee has an Attendance_Record with missed_logs_count greater than 0, THE Detection_System SHALL record the occurrence
2. WHEN an employee has 3 or more Attendance_Records with missed_logs_count greater than 0 within a 30-day period, THE Detection_System SHALL create a Violation_Record with type Missing Logs
3. WHEN total missed logs exceed 10 within a 30-day period, THE Detection_System SHALL set severity level to High
4. WHEN total missed logs are between 5 and 10 within a 30-day period, THE Detection_System SHALL set severity level to Medium
5. WHEN total missed logs are less than 5 within a 30-day period, THE Detection_System SHALL set severity level to Low
6. THE Detection_System SHALL store the dates with missing logs and total count in the metadata field
7. THE Detection_System SHALL use the missed_logs_count field from the attendance_records table for detection

### Requirement 12: Detect Excessive Logs

**User Story:** As an admin, I want the system to automatically detect when employees have excessive attendance logs on a single day, so that I can investigate potential time tracking issues

#### Acceptance Criteria

1. WHEN an employee has more than 4 attendance logs in the attendance_logs table for a specific date, THE Detection_System SHALL create a Violation_Record with type Excessive Logs
2. THE Detection_System SHALL count raw log entries from the attendance_logs table for the employee on the specific date
3. WHEN the log count exceeds 6, THE Detection_System SHALL set severity level to High
4. WHEN the log count is 5 or 6, THE Detection_System SHALL set severity level to Medium
5. THE Detection_System SHALL store the total log count and all log timestamps in the metadata field
6. THE Violation_Record details field SHALL state that the standard is 4 logs per day (morning IN, lunch OUT, lunch IN, afternoon OUT)

### Requirement 13: Detect Unauthorized Work Days

**User Story:** As an admin, I want the system to automatically detect employees working on unauthorized days, so that I can enforce schedule compliance

#### Acceptance Criteria

1. WHEN an employee has an Attendance_Record with status Present - Unauthorized Work Day, THE Detection_System SHALL create a Violation_Record with type Unauthorized Work
2. WHEN unauthorized work occurs 3 or more times within a 30-day period, THE Detection_System SHALL set severity level to High
3. WHEN unauthorized work occurs 1 or 2 times within a 30-day period, THE Detection_System SHALL set severity level to Medium
4. THE Detection_System SHALL store the unauthorized work dates in the metadata field

### Requirement 14: Detect Excessive Undertime

**User Story:** As an admin, I want the system to automatically detect employees with excessive undertime, so that I can address early departure patterns

#### Acceptance Criteria

1. WHEN an employee has 5 or more Attendance_Records with undertime_minutes greater than 0 within a 30-day period, THE Detection_System SHALL create a Violation_Record with type Excessive Undertime
2. WHEN total undertime minutes exceed 180 within a 30-day period, THE Detection_System SHALL set severity level to High
3. WHEN total undertime minutes are between 90 and 180 within a 30-day period, THE Detection_System SHALL set severity level to Medium
4. WHEN total undertime minutes are less than 90 within a 30-day period, THE Detection_System SHALL set severity level to Low
5. THE Detection_System SHALL store the undertime dates and total minutes in the metadata field

### Requirement 15: Detect Frequent Half Days

**User Story:** As an admin, I want the system to automatically detect employees with frequent half-day attendance, so that I can monitor partial attendance patterns

#### Acceptance Criteria

1. WHEN an employee has 4 or more Attendance_Records with status Half Day within a 30-day period, THE Detection_System SHALL create a Violation_Record with type Frequent Half Day
2. WHEN half-day count is 6 or more within a 30-day period, THE Detection_System SHALL set severity level to High
3. WHEN half-day count is 4 or 5 within a 30-day period, THE Detection_System SHALL set severity level to Medium
4. THE Detection_System SHALL store the half-day dates and count in the metadata field

### Requirement 16: Paginate Violation Results

**User Story:** As an admin, I want violations to be paginated, so that the page loads quickly even with many violations

#### Acceptance Criteria

1. THE Attendance_Violations_Page SHALL display 25 Violation_Records per page by default
2. THE Attendance_Violations_Page SHALL provide pagination controls to navigate between pages
3. THE Attendance_Violations_Page SHALL display the current page number and total page count
4. WHEN an admin navigates to a different page, THE System SHALL load and display the Violation_Records for that page
5. WHEN filters are applied, THE System SHALL reset pagination to page 1

### Requirement 17: Export Violation Data

**User Story:** As an admin, I want to export violation data to CSV, so that I can analyze trends and create reports

#### Acceptance Criteria

1. THE Attendance_Violations_Page SHALL provide an export button
2. WHEN the export button is clicked, THE System SHALL generate a CSV file containing all visible Violation_Records
3. THE CSV file SHALL include columns: employee name, employee ID, violation date, violation type, severity, status, details, and notes
4. WHEN filters are active, THE System SHALL export only the filtered Violation_Records
5. WHEN the CSV generation completes, THE System SHALL trigger a file download in the browser

### Requirement 18: Search Violations

**User Story:** As an admin, I want to search violations by employee name or violation details, so that I can quickly find specific violations

#### Acceptance Criteria

1. THE Attendance_Violations_Page SHALL provide a search input field
2. WHEN text is entered in the search field, THE System SHALL filter Violation_Records where employee name contains the search text
3. WHEN text is entered in the search field, THE System SHALL filter Violation_Records where details field contains the search text
4. THE System SHALL perform search filtering in real-time as the user types
5. WHEN the search field is cleared, THE Attendance_Violations_Page SHALL display all Violation_Records matching other active filters

### Requirement 19: Print Violation Notices

**User Story:** As an admin, I want to print violation notices, so that I can hand them to employees for formal notification

#### Acceptance Criteria

1. THE Violation_Details_Modal SHALL provide a print button
2. WHEN the print button is clicked, THE System SHALL generate a printable violation notice document
3. THE printable notice SHALL include employee name, employee ID, violation type, violation date, severity level, and detailed description
4. THE printable notice SHALL include the notes field content if notes exist for the Violation_Record
5. THE printable notice SHALL include a note that employees can verify their logs in the Lilo_System if they dispute the violation
6. WHEN the printable notice is generated, THE System SHALL open the browser print dialog
7. THE Attendance_Violations_Page SHALL provide a bulk print option to print multiple selected Violation_Records at once

### Requirement 20: Configure Grace Period Policy

**User Story:** As an admin, I want to configure grace period tracking rules per department, so that I can accommodate different branch policies

#### Acceptance Criteria

1. THE Settings_Page SHALL provide a section for configuring grace period policies per department
2. THE Settings_Page SHALL allow admins to select a department to configure its grace period settings
3. THE Settings_Page SHALL provide a toggle to enable or disable cumulative grace period tracking for the selected department
4. THE Settings_Page SHALL provide an input field to set the grace period limit in minutes for the selected department with a default value of 60
5. THE Settings_Page SHALL provide a dropdown to select the tracking period for the selected department with options: Monthly (default), Pay Period, Rolling 30 Days
6. THE Settings_Page SHALL display a note that the default tracking period is Monthly (calendar month) which is independent of pay period frequency
7. THE Settings_Page SHALL clarify that pay period configuration is for payroll calculation purposes and does not affect grace period tracking which remains monthly
8. THE Settings_Page SHALL provide an option to use traditional daily-only grace period (15 minutes per day with no cumulative tracking) for the selected department
9. WHEN the traditional daily-only option is selected for a department, THE System SHALL disable cumulative grace period tracking for that department
10. WHEN cumulative tracking is disabled for a department, THE Detection_System SHALL NOT generate Cumulative Grace Period Exceeded violations for employees in that department
11. WHEN a department has no specific configuration, THE System SHALL use default settings with cumulative tracking disabled
12. WHEN the tracking period is set to Pay Period for a department, THE Settings_Page SHALL provide an input field for pay period start day (1-31) for reference purposes only
13. WHEN the tracking period is set to Pay Period for a department, THE Settings_Page SHALL provide a dropdown to select pay period frequency with options: Weekly, Bi-weekly, Semi-monthly, Monthly for reference purposes only
14. THE Settings_Page SHALL display a clarification that pay period frequency affects when salary is paid, not the grace period allowance which is calculated monthly
15. WHEN grace period settings are changed for a department, THE System SHALL save the Department_Grace_Period_Settings to the database
16. WHEN grace period settings are changed for a department, THE System SHALL NOT retroactively affect existing Violation_Records
17. THE Settings_Page SHALL display the current grace period policy configuration for each department
18. THE grace period limit input field SHALL accept values between 1 and 480 minutes
19. WHEN an employee's department changes, THE Detection_System SHALL use the new department's grace period configuration for future violation detection
20. THE Settings_Page SHALL allow admins to configure grace period policies independently for each department
21. THE Settings_Page SHALL clarify that grace period is per calendar month regardless of pay period frequency (weekly, bi-weekly, monthly)
