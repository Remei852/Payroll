# Requirements Document

## Introduction

This feature enhances the existing attendance processing system with a 3-level safety architecture to handle complex and ambiguous attendance log patterns. The system will intelligently process logs, automatically flag violations, and provide a human review layer for cases that cannot be automatically resolved with confidence. Additionally, the attendance module will be restructured into 4 distinct subpages to improve visibility, debugging capabilities, and HR workflow efficiency.

## Glossary

- **Attendance_System**: The enhanced attendance processing system with 3-level safety architecture
- **Raw_Log**: A single timestamp entry from the attendance device (IN or OUT)
- **Attendance_Record**: A processed daily attendance entry containing time in, time out, and calculated metrics
- **Violation**: A detected attendance anomaly based on structural log patterns
- **Review_Queue**: A collection of attendance records requiring manual HR review
- **Auto_Processing_Engine**: The component that interprets raw logs into attendance records
- **Flagging_Engine**: The component that detects and categorizes violations
- **HR_User**: Human resources personnel who review flagged attendance issues
- **Ambiguous_Case**: An attendance log pattern that cannot be confidently interpreted automatically
- **Structural_Interpretation**: The best-guess pairing of logs into time in/out pairs
- **CSV_Import**: The process of uploading attendance device logs in CSV format
- **Processing_Status**: The state of a log (Unprocessed, Processed, Flagged, Reviewed)

## Requirements

### Requirement 1: Smart Auto-Processing Engine

**User Story:** As an HR user, I want the system to automatically process attendance logs with intelligent pattern recognition, so that common edge cases are handled without manual intervention.

#### Acceptance Criteria

1. WHEN a CSV file is uploaded, THE Auto_Processing_Engine SHALL parse all Raw_Logs and create Attendance_Records
2. WHEN double tap logs are detected (two logs within 2 minutes), THE Auto_Processing_Engine SHALL merge them into a single log entry
3. WHEN a forgot log pattern is detected (single IN without OUT or vice versa), THE Auto_Processing_Engine SHALL apply the configured default interpretation
4. WHEN extra click patterns are detected (three consecutive logs of same type), THE Auto_Processing_Engine SHALL use the first and last logs
5. WHEN rapid re-tap is detected (IN-OUT-IN within 5 minutes), THE Auto_Processing_Engine SHALL treat it as a single IN event
6. THE Auto_Processing_Engine SHALL assign a Structural_Interpretation to every set of Raw_Logs regardless of ambiguity

### Requirement 2: Automatic Violation Flagging

**User Story:** As an HR user, I want the system to automatically detect and flag attendance violations, so that I can identify problematic patterns without manual log inspection.

#### Acceptance Criteria

1. WHEN an employee has zero Raw_Logs for a workday, THE Flagging_Engine SHALL create a NO_LOG violation
2. WHEN an Attendance_Record has an odd number of logs that cannot be paired, THE Flagging_Engine SHALL create an UNPAIRED_LOG violation
3. WHEN an Attendance_Record has more than 4 Raw_Logs after filtering, THE Flagging_Engine SHALL create an EXCESS_LOGS violation
4. WHEN an Attendance_Record has a work session shorter than 4 hours, THE Flagging_Engine SHALL create a SHORT_SESSION violation
5. WHEN an Attendance_Record has a lunch break longer than 2 hours, THE Flagging_Engine SHALL create a LONG_LUNCH violation
6. WHEN an Attendance_Record has a time in after 9:00 AM, THE Flagging_Engine SHALL create a LATE_MORNING violation
7. WHEN an Attendance_Record has a time out before 5:00 PM, THE Flagging_Engine SHALL create an EARLY_OUT violation
8. THE Flagging_Engine SHALL assign a severity level (Low, Medium, High) to each violation

### Requirement 3: Human Review Layer

**User Story:** As an HR user, I want to review and correct ambiguous attendance cases, so that employees receive fair and accurate attendance records.

#### Acceptance Criteria

1. WHEN an Ambiguous_Case is detected, THE Attendance_System SHALL add the record to the Review_Queue
2. WHEN viewing the Review_Queue, THE Attendance_System SHALL display all Raw_Logs, the detected issue, and a suggested fix
3. WHEN an HR_User approves a suggestion, THE Attendance_System SHALL apply the fix and mark the record as Reviewed
4. WHEN an HR_User edits logs manually, THE Attendance_System SHALL save the corrections and mark the record as Reviewed
5. WHEN an HR_User marks a record as valid, THE Attendance_System SHALL preserve the original interpretation and mark the record as Reviewed
6. THE Attendance_System SHALL prevent final attendance calculation until all Review_Queue items are resolved

### Requirement 4: Raw Logs Subpage

**User Story:** As an HR user, I want to view all imported logs before processing, so that I can debug CSV import issues and verify data integrity.

#### Acceptance Criteria

1. THE Attendance_System SHALL provide a Raw_Logs subpage accessible from the attendance module
2. WHEN viewing Raw_Logs, THE Attendance_System SHALL display Employee, Timestamp, Device, Department, Log_Type, and Processing_Status columns
3. WHEN viewing Raw_Logs, THE Attendance_System SHALL allow filtering by employee, date range, and Processing_Status
4. WHEN viewing Raw_Logs, THE Attendance_System SHALL allow sorting by any column
5. THE Attendance_System SHALL display the total count of Raw_Logs matching the current filter

### Requirement 5: Violations Subpage

**User Story:** As an HR user, I want to view all detected attendance violations in one place, so that I can track problematic patterns and take corrective action.

#### Acceptance Criteria

1. THE Attendance_System SHALL provide a Violations subpage accessible from the attendance module
2. WHEN viewing Violations, THE Attendance_System SHALL display Employee, Date, Violation_Type, Log_Time, Severity, and Status columns
3. WHEN viewing Violations, THE Attendance_System SHALL allow filtering by employee, date range, Violation_Type, Severity, and Status
4. WHEN viewing Violations, THE Attendance_System SHALL display violation counts grouped by type
5. WHEN an HR_User clicks a violation, THE Attendance_System SHALL display the full details including all related Raw_Logs
6. THE Attendance_System SHALL allow marking violations as Reviewed or adding notes

### Requirement 6: Review Queue Subpage

**User Story:** As an HR user, I want a dedicated queue for records needing manual review, so that I can efficiently process ambiguous cases.

#### Acceptance Criteria

1. THE Attendance_System SHALL provide a Review_Queue subpage accessible from the attendance module
2. WHEN viewing Review_Queue, THE Attendance_System SHALL display Employee, Date, Logs, Detected_Issue, Suggested_Fix, and Action columns
3. WHEN viewing Review_Queue, THE Attendance_System SHALL display records in priority order (High severity first)
4. WHEN an HR_User selects a record, THE Attendance_System SHALL display all Raw_Logs with timestamps in chronological order
5. WHEN an HR_User selects "Approve Suggestion", THE Attendance_System SHALL apply the suggested fix and remove the record from the queue
6. WHEN an HR_User selects "Edit Logs", THE Attendance_System SHALL provide an interface to add, remove, or modify log timestamps
7. WHEN an HR_User selects "Mark as Valid", THE Attendance_System SHALL accept the current interpretation and remove the record from the queue
8. THE Attendance_System SHALL display the count of pending Review_Queue items on the main attendance page

### Requirement 7: Enhanced Attendance Main Page

**User Story:** As an HR user, I want the main attendance page to show processing status and violation summaries, so that I can quickly assess attendance data quality.

#### Acceptance Criteria

1. WHEN viewing the main Attendance page, THE Attendance_System SHALL display the count of records in Review_Queue
2. WHEN viewing the main Attendance page, THE Attendance_System SHALL display violation counts by type (Late, Undertime, Overtime)
3. WHEN viewing the main Attendance page, THE Attendance_System SHALL allow filtering by department and date range
4. WHEN viewing the main Attendance page, THE Attendance_System SHALL display a processing status indicator (Processing, Flagged, Review Needed, Complete)
5. WHEN an HR_User clicks on a violation count, THE Attendance_System SHALL navigate to the Violations subpage with the appropriate filter applied

### Requirement 8: Ambiguous Case Detection

**User Story:** As an HR user, I want the system to identify cases that cannot be confidently auto-processed, so that I can review them before finalizing attendance.

#### Acceptance Criteria

1. WHEN an employee has exactly 1 Raw_Log for a workday, THE Attendance_System SHALL mark it as an Ambiguous_Case
2. WHEN an employee has exactly 3 Raw_Logs with irregular spacing (gaps > 30 minutes), THE Attendance_System SHALL mark it as an Ambiguous_Case
3. WHEN an employee has exactly 5 Raw_Logs with irregular spacing, THE Attendance_System SHALL mark it as an Ambiguous_Case
4. WHEN an employee has logs spanning more than 14 hours, THE Attendance_System SHALL mark it as an Ambiguous_Case
5. WHEN an Ambiguous_Case is detected, THE Attendance_System SHALL assign the best Structural_Interpretation and add it to Review_Queue
6. THE Attendance_System SHALL provide a confidence score (0-100) for each Structural_Interpretation

### Requirement 9: Violation Persistence and Audit Trail

**User Story:** As an HR user, I want all violations and reviews to be permanently recorded, so that I can track patterns and maintain compliance records.

#### Acceptance Criteria

1. THE Attendance_System SHALL store all detected violations in a violations table with timestamp of detection
2. WHEN an HR_User reviews a record, THE Attendance_System SHALL record the reviewer identity, timestamp, and action taken
3. WHEN an HR_User modifies logs, THE Attendance_System SHALL preserve the original Raw_Logs and store the modifications separately
4. THE Attendance_System SHALL allow viewing the complete audit trail for any Attendance_Record
5. THE Attendance_System SHALL allow exporting violation reports filtered by date range, employee, or violation type

### Requirement 10: Navigation and Module Structure

**User Story:** As an HR user, I want clear navigation between the 4 attendance subpages, so that I can efficiently move between different views of attendance data.

#### Acceptance Criteria

1. THE Attendance_System SHALL provide a tab navigation interface with 4 tabs: Attendance, Raw Logs, Violations, Review Queue
2. WHEN viewing any subpage, THE Attendance_System SHALL highlight the active tab
3. WHEN unresolved items exist in Review_Queue, THE Attendance_System SHALL display a badge count on the Review Queue tab
4. WHEN new violations are detected, THE Attendance_System SHALL display a badge count on the Violations tab
5. THE Attendance_System SHALL preserve filter and sort settings when navigating between tabs within the same session

### Requirement 11: Processing Configuration

**User Story:** As a system administrator, I want to configure the auto-processing rules and thresholds, so that the system can adapt to different organizational policies.

#### Acceptance Criteria

1. THE Attendance_System SHALL provide a configuration interface for double-tap threshold (default 2 minutes)
2. THE Attendance_System SHALL provide a configuration interface for rapid re-tap threshold (default 5 minutes)
3. THE Attendance_System SHALL provide a configuration interface for SHORT_SESSION threshold (default 4 hours)
4. THE Attendance_System SHALL provide a configuration interface for LONG_LUNCH threshold (default 2 hours)
5. THE Attendance_System SHALL provide a configuration interface for LATE_MORNING threshold (default 9:00 AM)
6. THE Attendance_System SHALL provide a configuration interface for EARLY_OUT threshold (default 5:00 PM)
7. WHEN configuration values are changed, THE Attendance_System SHALL apply them to future processing without affecting historical records

### Requirement 12: Batch Review Operations

**User Story:** As an HR user, I want to perform actions on multiple review queue items at once, so that I can efficiently process similar cases.

#### Acceptance Criteria

1. WHEN viewing Review_Queue, THE Attendance_System SHALL allow selecting multiple records via checkboxes
2. WHEN multiple records are selected, THE Attendance_System SHALL provide a "Bulk Approve" action
3. WHEN multiple records are selected with the same Detected_Issue, THE Attendance_System SHALL provide a "Apply Same Fix to All" action
4. WHEN bulk actions are performed, THE Attendance_System SHALL record each action individually in the audit trail
5. THE Attendance_System SHALL display a confirmation dialog before executing bulk actions
