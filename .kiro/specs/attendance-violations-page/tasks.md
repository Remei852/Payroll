# Implementation Plan: Attendance Violations Page

## Overview

This implementation plan covers the development of an admin-only attendance violations management system. The feature includes automated detection of 9 violation types through daily batch processing, per-department grace period configuration, comprehensive filtering and search, status tracking, CSV export, and print functionality. The backend uses Laravel (PHP) with a ViolationDetectionService for detection logic, while the frontend uses React/Inertia.js for the UI.

## Tasks

- [x] 1. Set up database schema and models
  - [x] 1.1 Create department_grace_period_settings migration
    - Create migration file with table structure: department_id (unique FK), cumulative_tracking_enabled (boolean), grace_period_limit_minutes (int), tracking_period (enum), pay_period_start_day (int nullable), pay_period_frequency (enum nullable)
    - Add indexes for department_id
    - _Requirements: 5.3, 5.4, 5.5, 18.1-18.19_
  
  - [x] 1.2 Extend existing attendance_violations table
    - Create migration to extend existing table (already has: id, employee_id, violation_date, violation_type, details, severity, status, metadata, timestamps)
    - Add 'Critical' to severity enum (currently has: Low, Medium, High)
    - Add notes (TEXT NULL), dismissed_at (TIMESTAMP NULL), dismissed_by (BIGINT UNSIGNED NULL)
    - Add foreign key constraint on dismissed_by referencing users.id
    - Add index on dismissed_at for filtering performance
    - _Requirements: 5.1, 5.4, 5.8, 6.6, 6.11, 6.12_
  
  - [x] 1.3 Create DepartmentGracePeriodSettings model
    - Define fillable fields, casts, and default constants
    - Add department relationship (belongsTo)
    - _Requirements: 5.3, 5.4, 5.5, 18.1-18.19_
  
  - [x] 1.4 Create AttendanceViolation model
    - Create new model file (table already exists in database)
    - Add notes, dismissed_at, dismissed_by to $fillable array
    - Add dismissed_at to $casts as 'datetime'
    - Add dismissedBy() relationship method (belongsTo User)
    - Add scopeActive() query scope to exclude dismissed violations (WHERE dismissed_at IS NULL)
    - Add scopeDismissed() query scope to include only dismissed violations (WHERE dismissed_at IS NOT NULL)
    - Add dismiss($userId) method to set dismissed_at and dismissed_by
    - Define fillable fields, casts (violation_date as date, metadata as array)
    - Add employee relationship (belongsTo)
    - Implement query scopes: byType, bySeverity, byStatus, dateRange, search
    - _Requirements: 1.1, 1.2, 2.6, 5.4, 6.6, 6.9, 6.11, 6.12, 16.3_
  
  - [ ]* 1.5 Write unit tests for model relationships and scopes
    - Test AttendanceViolation scopes with various filter combinations
    - Test scopeActive() excludes dismissed violations
    - Test scopeDismissed() includes only dismissed violations
    - Test dismiss() method sets correct fields
    - Test dismissedBy relationship
    - Test DepartmentGracePeriodSettings default values
    - _Requirements: 1.1, 2.6, 6.9, 6.12_

- [x] 2. Implement ViolationDetectionService core infrastructure
  - [x] 2.1 Create ViolationDetectionService class with dependency injection
    - Set up constructor with required model dependencies
    - Implement detectViolationsForDate() method that processes all employees
    - Implement detectViolationsForEmployee() method for specific employee/date range
    - Implement getGracePeriodSettings() helper with fallback to defaults
    - Implement getTrackingPeriodRange() for monthly, pay_period, and rolling_30 calculations
    - **NOTE:** AttendanceService already detects 7 violation types in real-time during daily processing (Multiple Logs, Missing Log single occurrence, Early/Late Lunch, Excessive Late, Excessive Undertime single occurrence)
    - **FOCUS:** This service handles NEW violation types and pattern-based detection requiring historical data:
      - Cumulative Grace Period (requires summing late minutes over tracking period)
      - Unexcused Absence (status-based detection)
      - AWOL (3+ consecutive absences)
      - Biometrics Policy (missing timestamps)
      - Unauthorized Work (pattern: 3+ occurrences in 30 days)
      - Missing Logs Pattern (pattern: 3+ occurrences in 30 days)
      - Excessive Undertime Pattern (pattern: 5+ occurrences in 30 days)
      - Frequent Half Day (pattern: 4+ occurrences in 30 days)
    - **COORDINATION:** Avoid duplicating violations already created by AttendanceService
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  
  - [ ]* 2.2 Write property test for department configuration resolution
    - **Property 8: Department Configuration Resolution**
    - **Validates: Requirements 5.3, 5.4, 5.5, 18.11**
  
  - [ ]* 2.3 Write property test for tracking period date range calculation
    - **Property 9: Tracking Period Date Range Calculation**
    - **Validates: Requirements 5.6, 5.7, 5.8**

- [x] 3. Implement cumulative grace period violation detection
  - [x] 3.1 Implement detectCumulativeGracePeriodViolation() method
    - Check if cumulative tracking enabled for employee's department
    - Calculate tracking period date range based on department settings
    - Query attendance_records for late_minutes_am and late_minutes_pm within period
    - Sum total late minutes
    - Compare against grace period limit
    - Create violation record with metadata (total_late_minutes, grace_period_used, grace_period_limit, deductible_minutes, tracking_period, tracking_start, tracking_end, affected_dates array)
    - Set severity to High
    - _Requirements: 5.1, 5.2, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 5.15, 5.16, 5.17_
  
  - [ ]* 3.2 Write property test for cumulative grace period threshold detection
    - **Property 7: Cumulative Grace Period Threshold Detection**
    - **Validates: Requirements 5.2**
  
  - [ ]* 3.3 Write property test for late minutes summation
    - **Property 10: Late Minutes Summation**
    - **Validates: Requirements 5.11**
  
  - [ ]* 3.4 Write property test for grace period deduction calculation
    - **Property 11: Grace Period Deduction Calculation**
    - **Validates: Requirements 5.12, 5.13, 5.15, 5.16, 5.17**
  
  - [ ]* 3.5 Write property test for cumulative violation metadata completeness
    - **Property 12: Cumulative Violation Metadata Completeness**
    - **Validates: Requirements 5.10, 5.12, 5.13**
  
  - [ ]* 3.6 Write unit tests for cumulative grace period edge cases
    - Test with exactly at threshold (60 minutes)
    - Test with no late minutes
    - Test with tracking disabled
    - Test with missing department configuration
    - _Requirements: 5.2, 5.4, 5.5_

- [x] 4. Implement unexcused absence and AWOL detection
  - [x] 4.1 Implement detectUnexcusedAbsence() method
    - Query attendance_records for status = "Absent" (not "Absent - Excused")
    - Create violation record with type "Unexcused Absence", severity High
    - Store absence date in metadata
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 4.2 Implement detectAWOL() method
    - Query last 3 consecutive attendance_records with status "Absent"
    - Exclude weekends and holidays based on employee's work schedule
    - Create violation record with type "AWOL", severity Critical
    - Store three consecutive dates in metadata
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 4.3 Write property test for unexcused absence detection
    - **Property 13: Unexcused Absence Detection**
    - **Validates: Requirements 6.1, 6.2, 6.5**
  
  - [ ]* 4.4 Write property test for AWOL consecutive detection
    - **Property 14: AWOL Consecutive Detection**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
  
  - [ ]* 4.5 Write unit tests for absence detection edge cases
    - Test "Absent - Excused" does not trigger unexcused absence
    - Test AWOL with weekends/holidays in between
    - Test AWOL with only 2 consecutive absences
    - _Requirements: 6.5, 7.5_

- [x] 5. Implement biometrics and log-related violation detection
  - [x] 5.1 Implement detectBiometricsViolation() method
    - Query attendance_records where time_in_am IS NULL OR time_out_pm IS NULL
    - Set severity to High if both null, Medium if one null
    - Store missing timestamps in metadata
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 5.2 Implement detectMissingLogsPattern() method
    - Query attendance_records with missed_logs_count > 0 within 30-day period
    - Count occurrences (must be >= 3)
    - Calculate total missed logs
    - Set severity: High (>10), Medium (5-10), Low (<5)
    - Store affected dates and counts in metadata
    - **NOTE:** AttendanceService already creates "Missing Log" violations for single occurrences during daily processing
    - **FOCUS:** This method detects the PATTERN (3+ occurrences in 30 days) which indicates a recurring issue
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [x] 5.3 Remove detectExcessiveLogs() method (already handled by AttendanceService)
    - **NOTE:** AttendanceService.detectViolations() already creates "Multiple Logs" violations during daily processing
    - **ACTION:** Do not implement this method to avoid duplication
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ]* 5.4 Write property test for biometrics policy violation detection
    - **Property 15: Biometrics Policy Violation Detection**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
  
  - [ ]* 5.5 Write property test for missing logs pattern detection
    - **Property 16: Missing Logs Pattern Detection**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**
  
  - [ ]* 5.6 Remove property test for excessive logs detection (not needed)
    - **NOTE:** Excessive logs detection is handled by AttendanceService, not ViolationDetectionService
    - **ACTION:** Do not implement this test
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ]* 5.7 Write unit tests for log violation edge cases
    - Test exactly 3 occurrences of missing logs pattern
    - Test biometrics with only lunch timestamps missing
    - **NOTE:** Do not test excessive logs (handled by AttendanceService)
    - _Requirements: 8.1, 9.2_

- [x] 6. Implement work pattern violation detection
  - [x] 6.1 Implement detectUnauthorizedWork() method
    - Query attendance_records with status "Present - Unauthorized Work Day"
    - Count occurrences within 30-day period
    - Set severity: High (>=3), Medium (1-2)
    - Store unauthorized dates in metadata
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 6.2 Implement detectExcessiveUndertime() method
    - Query attendance_records with undertime_minutes > 0 within 30-day period
    - Count occurrences (must be >= 5)
    - Calculate total undertime minutes
    - Set severity: High (>180), Medium (90-180), Low (<90)
    - Store affected dates and undertime minutes in metadata
    - **NOTE:** AttendanceService already creates "Excessive Undertime" violations for single occurrences during daily processing
    - **FOCUS:** This method detects the PATTERN (5+ occurrences in 30 days) which indicates a recurring issue
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [x] 6.3 Implement detectFrequentHalfDay() method
    - Query attendance_records with status "Half Day" within 30-day period
    - Count occurrences (must be >= 4)
    - Set severity: High (>=6), Medium (4-5)
    - Store half-day dates in metadata
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [ ]* 6.4 Write property test for unauthorized work pattern detection
    - **Property 18: Unauthorized Work Pattern Detection**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
  
  - [ ]* 6.5 Write property test for excessive undertime pattern detection
    - **Property 19: Excessive Undertime Pattern Detection**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**
  
  - [ ]* 6.6 Write property test for frequent half day pattern detection
    - **Property 20: Frequent Half Day Pattern Detection**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
  
  - [ ]* 6.7 Write unit tests for work pattern edge cases
    - Test exactly 5 undertime occurrences
    - Test exactly 4 half-day occurrences
    - Test exactly 3 unauthorized work occurrences
    - _Requirements: 11.2, 12.1, 13.1_

- [x] 7. Checkpoint - Ensure all violation detection tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create scheduled command for daily violation detection
  - [x] 8.1 Create DetectViolationsCommand artisan command
    - Define signature with optional --date parameter
    - Inject ViolationDetectionService
    - Implement handle() method to call detectViolationsForDate()
    - Add error handling and logging for failed detections
    - Output summary of violations detected
    - **NOTE:** This command focuses on batch/pattern detection only
    - **REAL-TIME DETECTION:** AttendanceService.detectViolations() already runs during daily attendance processing for immediate violations (Multiple Logs, Missing Log single occurrence, Early/Late Lunch, Excessive Late, Excessive Undertime single occurrence)
    - **BATCH DETECTION:** This command detects patterns requiring historical data (AWOL, frequent patterns, cumulative grace period)
    - _Requirements: 5.14_
  
  - [x] 8.2 Register command in Kernel.php schedule
    - Schedule command to run daily at 23:00 (11 PM)
    - Add withoutOverlapping() to prevent concurrent runs
    - Add runInBackground() for performance
    - _Requirements: 5.14_
  
  - [ ]* 8.3 Write unit tests for DetectViolationsCommand
    - Test command execution with date parameter
    - Test command output formatting
    - Test error handling
    - _Requirements: 5.14_

- [x] 9. Implement ViolationsController backend endpoints
  - [x] 9.1 Create ViolationsController with admin middleware
    - Implement index() method with filters, search, pagination (25 per page)
    - Apply scopeActive() by default to exclude dismissed violations
    - Apply filters: employee_name, violation_type, severity, status, date_range, department_id
    - Add optional show_dismissed filter to include dismissed violations
    - Eager load employee relationship
    - Sort by violation_date DESC by default
    - Return Inertia response with violations and filter data
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.9, 6.12, 6.13, 14.1, 14.2, 14.5, 16.3_
  
  - [x] 9.2 Implement show() method for violation details
    - Load violation with employee relationship
    - Return Inertia response with violation data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 9.3 Implement updateStatus() method
    - Validate status value (Pending, Reviewed, Letter Sent)
    - Update violation record
    - Return redirect with success message
    - Handle errors with error messages
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 9.4 Implement updateNotes() method
    - Validate notes field (max 2000 characters, nullable)
    - Update violation record notes field
    - Return JSON response with success status
    - Handle validation errors with error messages
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.8_
  
  - [x] 9.5 Implement dismissViolation() method
    - Load violation record by ID
    - Call dismiss() method with authenticated user ID
    - Return JSON response with success status
    - Handle errors with error messages
    - _Requirements: 6.6, 6.7, 6.8, 6.10, 6.11_
  
  - [x] 9.6 Implement export() method for CSV generation
    - Apply same filters as index()
    - Generate CSV with columns: employee_name, employee_id, violation_date, violation_type, severity, status, details, notes
    - Return BinaryFileResponse with CSV file
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 5.10_
  
  - [x] 9.7 Implement print() method for single violation notice
    - Load violation with employee relationship
    - Return Inertia response with printable layout
    - Include all violation details, notes (if present), and Lilo system verification note
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 5.9_
  
  - [x] 9.8 Implement bulkPrint() method for multiple violations
    - Validate violation IDs array
    - Load violations with employee relationships
    - Return Inertia response with printable layout for all violations
    - _Requirements: 17.5_
  
  - [x] 9.9 Implement getGracePeriodSettings() method
    - Load department grace period settings by department ID
    - Return JSON response with settings or defaults
    - _Requirements: 18.1, 18.2, 18.3_
  
  - [x] 9.10 Implement updateGracePeriodSettings() method
    - Validate input: cumulative_tracking_enabled (boolean), grace_period_limit_minutes (1-480), tracking_period (enum), pay_period fields
    - Create or update department settings
    - Return JSON response with updated settings
    - _Requirements: 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10, 18.15, 18.18_
  
  - [ ]* 9.11 Write property test for status update persistence
    - **Property 6: Status Update Persistence**
    - **Validates: Requirements 4.3, 4.6**
  
  - [ ]* 9.12 Write property test for notes persistence round-trip
    - **Property 31: Notes Persistence Round-Trip**
    - **Validates: Requirements 5.4, 5.8**
  
  - [ ]* 9.13 Write property test for dismissal persistence
    - **Property 34: Dismissal Persistence**
    - **Validates: Requirements 6.6, 6.11**
  
  - [ ]* 9.14 Write property test for dismissed violations exclusion from default query
    - **Property 35: Dismissed Violations Exclusion from Default Query**
    - **Validates: Requirements 6.9, 6.12**
  
  - [ ]* 9.15 Write property test for dismissed violations filter inclusion
    - **Property 36: Dismissed Violations Filter Inclusion**
    - **Validates: Requirements 6.13**
  
  - [ ]* 9.16 Write property test for notes character limit validation
    - **Property 37: Notes Character Limit Validation**
    - **Validates: Requirements 5.8**
  
  - [ ]* 9.17 Write property test for CSV export filter consistency
    - **Property 24: CSV Export Filter Consistency**
    - **Validates: Requirements 15.4**
  
  - [ ]* 9.18 Write property test for grace period settings persistence
    - **Property 27: Grace Period Settings Persistence**
    - **Validates: Requirements 18.15**
  
  - [ ]* 9.19 Write property test for grace period limit validation
    - **Property 29: Grace Period Limit Validation**
    - **Validates: Requirements 18.18**
  
  - [ ]* 9.20 Write unit tests for ViolationsController
    - Test index with various filter combinations
    - Test index with show_dismissed filter
    - Test show returns correct violation
    - Test updateStatus with invalid status
    - Test updateNotes with valid and invalid input
    - Test dismissViolation updates correct fields
    - Test export CSV format includes notes column
    - Test print notice generation includes notes
    - Test grace period settings CRUD
    - Test admin authorization
    - _Requirements: 1.1, 2.6, 4.3, 5.4, 5.8, 5.9, 5.10, 6.6, 6.13, 15.3, 17.3, 18.15_

- [x] 10. Configure routes for violations management
  - [x] 10.1 Add violations routes in routes/web.php
    - Add admin middleware group
    - Define routes: GET /violations (index), GET /violations/{id} (show), PATCH /violations/{id}/status (updateStatus), PATCH /violations/{id}/notes (updateNotes), POST /violations/{id}/dismiss (dismissViolation), GET /violations/export (export), GET /violations/{id}/print (print), POST /violations/bulk-print (bulkPrint)
    - Define grace period settings routes: GET /settings/grace-period/{departmentId}, PUT /settings/grace-period/{departmentId}
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1, 15.1, 17.1, 18.1_
  
  - [ ]* 10.2 Write integration tests for route authorization
    - Test non-admin users cannot access violations routes
    - Test admin users can access all routes
    - _Requirements: 1.1_

- [x] 11. Checkpoint - Ensure backend implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Create Violations/Index.jsx main page component
  - [x] 12.1 Create Violations/Index.jsx with table layout
    - Accept props: violations (paginated), filters, departments
    - Render table with columns: employee name, violation date, violation type, severity, status
    - Implement severity color indicators: Critical (dark red), High (red), Medium (yellow), Low (blue)
    - Add sort by violation_date DESC
    - Integrate ViolationFilters component
    - Add search input for employee name/details
    - Add pagination controls (25 per page)
    - Add "Export CSV" button
    - Add bulk select checkboxes and "Print Selected" button
    - Handle filter changes with URL params and Inertia reload
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1-2.7, 14.1-14.5, 15.1, 16.1, 16.2, 16.3, 17.5_
  
  - [ ]* 12.2 Write property test for violation list display completeness
    - **Property 1: Violation List Display Completeness**
    - **Validates: Requirements 1.2**
  
  - [ ]* 12.3 Write property test for default sort order
    - **Property 2: Default Sort Order**
    - **Validates: Requirements 1.3**
  
  - [ ]* 12.4 Write property test for severity visual indicator mapping
    - **Property 3: Severity Visual Indicator Mapping**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7**
  
  - [ ]* 12.5 Write property test for pagination consistency
    - **Property 21: Pagination Consistency**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**
  
  - [ ]* 12.6 Write property test for filter application resets pagination
    - **Property 22: Filter Application Resets Pagination**
    - **Validates: Requirements 14.5**
  
  - [ ]* 12.7 Write unit tests for Violations/Index.jsx
    - Test table renders with violation data
    - Test filter controls update URL params
    - Test search input filters results
    - Test pagination navigation
    - Test export button triggers download
    - Test bulk select and print
    - Test severity color indicators
    - _Requirements: 1.2, 1.3, 1.4, 2.6, 14.1, 15.1, 16.3_

- [x] 13. Create ViolationDetailsModal.jsx component
  - [x] 13.1 Create ViolationDetailsModal.jsx with modal layout
    - Accept props: violation, isOpen, onClose, onStatusUpdate, onNotesUpdate, onDismiss
    - Display employee name and employee ID
    - Display violation date, type, severity, status
    - Display details field content
    - Display metadata in readable format based on violation type
    - For Cumulative Grace Period: show total_late_minutes, grace_period_used, grace_period_limit, deductible_minutes, affected_dates breakdown
    - For AWOL: show three consecutive dates
    - For Biometrics: show missing timestamps
    - For Excessive Logs: show log count and timestamps
    - Add notes text area with character counter (max 2000 characters)
    - Add save notes button (enabled when notes are modified)
    - Display existing notes if present
    - Add status dropdown (Pending, Reviewed, Letter Sent) with update handler
    - Add dismiss button with confirmation dialog
    - Add confirmation dialog with "Are you sure you want to dismiss this violation? This action will remove it from the violations list." message
    - Add "Print Notice" button
    - Add close button
    - Handle onNotesUpdate callback when save notes button is clicked
    - Handle onDismiss callback when dismiss is confirmed
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.1, 4.2, 5.1, 5.2, 5.3, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 17.1_
  
  - [ ]* 13.2 Write property test for print notice field completeness
    - **Property 26: Print Notice Field Completeness**
    - **Validates: Requirements 17.3, 17.4**
  
  - [ ]* 13.3 Write property test for notes inclusion in print output
    - **Property 32: Notes Inclusion in Print Output**
    - **Validates: Requirements 5.9**
  
  - [ ]* 13.4 Write unit tests for ViolationDetailsModal.jsx
    - Test modal displays all violation fields
    - Test conditional rendering based on violation type
    - Test notes text area with character counter
    - Test save notes button enabled/disabled state
    - Test dismiss button shows confirmation dialog
    - Test confirmation dialog cancel and confirm actions
    - Test status dropdown updates
    - Test print button functionality
    - Test modal close behavior
    - _Requirements: 3.2, 3.3, 3.4, 3.7, 4.1, 5.1, 5.3, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Create ViolationFilters.jsx component
  - [x] 14.1 Create ViolationFilters.jsx with filter controls
    - Accept props: filters, onFilterChange, departments
    - Add employee name text input
    - Add violation type dropdown (all 9 types)
    - Add severity dropdown (Low, Medium, High, Critical)
    - Add status dropdown (Pending, Reviewed, Letter Sent)
    - Add date range inputs (start_date, end_date)
    - Add department dropdown
    - Add "Clear Filters" button
    - Call onFilterChange when any filter changes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 16.5_
  
  - [ ]* 14.2 Write property test for filter conjunction
    - **Property 4: Filter Conjunction**
    - **Validates: Requirements 2.6**
  
  - [ ]* 14.3 Write property test for filter clear round-trip
    - **Property 5: Filter Clear Round-Trip**
    - **Validates: Requirements 2.7, 16.5**
  
  - [ ]* 14.4 Write property test for search text matching
    - **Property 25: Search Text Matching**
    - **Validates: Requirements 16.3**
  
  - [ ]* 14.5 Write unit tests for ViolationFilters.jsx
    - Test all filter controls render
    - Test filter changes call onChange callback
    - Test clear filters button resets all values
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

- [x] 15. Create GracePeriodSettingsTab.jsx component
  - [x] 15.1 Create Settings/Tabs/GracePeriodSettingsTab.jsx and integrate into Settings page
    - Accept props: departments, settings
    - Add department selector dropdown
    - Add cumulative tracking enabled toggle
    - Add grace period limit input (1-480 minutes) with validation
    - Add tracking period dropdown (monthly, pay_period, rolling_30)
    - Conditionally show pay period fields when tracking_period = "pay_period"
    - Add pay_period_start_day input (1-31)
    - Add pay_period_frequency dropdown (weekly, bi-weekly, semi-monthly, monthly)
    - Add informational note about monthly tracking
    - Add "Save Settings" button
    - Handle form submission with validation
    - Display success/error messages
    - **NOTE:** Settings page already exists at resources/js/Pages/Settings/Index.jsx with tab structure
    - **INTEGRATION:** Import component and add "Grace Period" tab to existing tabs array in Settings/Index.jsx
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10, 18.11, 18.12, 18.13, 18.14, 18.15, 18.17, 18.18_
  
  - [ ]* 15.2 Write property test for settings change non-retroactivity
    - **Property 28: Settings Change Non-Retroactivity**
    - **Validates: Requirements 18.16**
  
  - [ ]* 15.3 Write property test for department change configuration application
    - **Property 30: Department Change Configuration Application**
    - **Validates: Requirements 18.19**
  
  - [ ]* 15.4 Write unit tests for GracePeriodSettingsTab.jsx
    - Test department selector
    - Test form fields render based on tracking period
    - Test validation errors display
    - Test save button submits correct data
    - Test informational notes display
    - _Requirements: 18.1, 18.4, 18.15, 18.18_

- [x] 16. Integrate grace period settings tab into Settings page
  - [x] 16.1 Verify GracePeriodSettingsTab integration in Settings/Index.jsx
    - **NOTE:** This is handled in task 15.1 - Settings page already exists with tab structure
    - **ACTION:** Verify the tab is properly added to the tabs array during implementation of 15.1
    - _Requirements: 18.1_
  
  - [ ]* 16.2 Write integration test for settings tab navigation
    - Test grace period tab displays when selected
    - **NOTE:** Combined with task 15.1 implementation
    - _Requirements: 18.1_

- [x] 17. Add database indexes for performance optimization
  - [x] 17.1 Create migration for additional indexes
    - Add index on attendance_violations.violation_date
    - Add index on attendance_violations.severity
    - Verify existing indexes: idx_employee_date, idx_status, idx_type
    - _Requirements: Performance optimization_
  
  - [ ]* 17.2 Write performance tests for violation queries
    - Test index query performance with 10,000+ records
    - Test filter application performance
    - _Requirements: Performance optimization_

- [x] 18. Implement CSV export functionality
  - [x] 18.1 Add CSV export logic to ViolationsController export() method
    - Generate CSV headers: Employee Name, Employee ID, Violation Date, Violation Type, Severity, Status, Details, Notes
    - Stream CSV rows for filtered violations
    - Include notes column in CSV output
    - Set appropriate headers for file download
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 5.10_
  
  - [ ]* 18.2 Write property test for CSV export column completeness
    - **Property 23: CSV Export Column Completeness**
    - **Validates: Requirements 15.3**
  
  - [ ]* 18.3 Write property test for notes inclusion in CSV export
    - **Property 33: Notes Inclusion in CSV Export**
    - **Validates: Requirements 5.10**
  
  - [ ]* 18.4 Write unit tests for CSV export
    - Test CSV format with sample data
    - Test CSV with filtered results
    - Test CSV with empty results
    - Test CSV includes notes column
    - _Requirements: 15.3, 15.4, 5.10_

- [-] 19. Implement print notice functionality
  - [-] 19.1 Create printable violation notice view
    - Create Inertia page component for print layout
    - Include employee name, employee ID, violation type, violation date, severity, detailed description
    - Include notes content if notes exist for the violation
    - Add note about verifying logs in Lilo system
    - Add print-friendly CSS styling
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 5.9_
  
  - [ ] 19.2 Add print button handlers in ViolationDetailsModal and Index
    - Single violation print: navigate to print route
    - Bulk print: submit selected violation IDs to bulkPrint route
    - _Requirements: 17.1, 17.5_
  
  - [ ]* 19.3 Write unit tests for print functionality
    - Test print notice includes all required fields
    - Test print notice includes notes when present
    - Test bulk print with multiple violations
    - _Requirements: 17.3, 17.4, 17.5, 5.9_

- [ ] 20. Add error handling and validation
  - [ ] 20.1 Add backend validation rules
    - Validate status enum values in updateStatus()
    - Validate notes field (max 2000 characters, nullable) in updateNotes()
    - Validate grace period limit range (1-480) in updateGracePeriodSettings()
    - Validate tracking period enum values
    - Validate pay period configuration when tracking_period = "pay_period"
    - _Requirements: 4.5, 5.6, 5.8, 18.18_
  
  - [ ] 20.2 Add frontend validation
    - Validate notes character limit (max 2000) with character counter
    - Validate grace period limit input (1-480)
    - Validate required fields in grace period settings form
    - Display inline validation errors
    - _Requirements: 5.7, 5.8, 18.18_
  
  - [ ] 20.3 Add error handling for API failures
    - Display error toasts for failed status updates
    - Display error messages for failed notes updates
    - Display error messages for failed dismissal actions
    - Display error messages for failed CSV exports
    - Display error messages for failed print generation
    - Handle network errors gracefully
    - _Requirements: 4.5, 5.5, 5.6, 6.10, 15.5, 17.6_
  
  - [ ]* 20.4 Write unit tests for error handling
    - Test validation error display
    - Test API error handling
    - Test network error recovery
    - Test notes character limit validation
    - _Requirements: 4.5, 5.6, 5.8, 6.10, 15.5, 17.6_

- [ ] 21. Final checkpoint - Ensure all tests pass and integration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use Pest with Pest Property Testing plugin (minimum 100 iterations)
- Backend uses Laravel (PHP) with Eloquent ORM
- Frontend uses React with Inertia.js for seamless SPA experience
- Scheduled command runs daily at 11 PM after attendance processing completes
- All routes require admin authentication middleware
- Violations are detected in batch, not real-time
- Grace period tracking is always monthly regardless of pay period frequency
- Existing attendance_violations table migration already exists with columns: id, employee_id, violation_date, violation_type, details, severity (Low/Medium/High), status (Pending/Reviewed/Letter Sent), metadata, timestamps
- Manual review workflow allows admins to add context notes and dismiss false positive violations
- Dismissed violations are soft-deleted (excluded from default queries but retained for audit trail)
- Notes field supports up to 2000 characters and is included in CSV exports and printable notices

**EXISTING IMPLEMENTATION TO AVOID DUPLICATION:**
- AttendanceService.detectViolations() (line 1637) already creates violations during daily attendance processing for:
  - Multiple Logs (excessive biometric logs in one day)
  - Missing Log (single occurrence of missed biometric log)
  - Early Lunch OUT, Late Lunch OUT, Early Lunch IN (lunch timing violations)
  - Excessive Late (single occurrence of excessive lateness)
  - Excessive Undertime (single occurrence of excessive undertime)
- ViolationDetectionService focuses on NEW violation types and pattern-based detection:
  - Cumulative Grace Period (requires summing late minutes over tracking period)
  - Unexcused Absence (status-based detection)
  - AWOL (3+ consecutive absences)
  - Biometrics Policy (missing timestamps)
  - Unauthorized Work Pattern (3+ occurrences in 30 days)
  - Missing Logs Pattern (3+ occurrences in 30 days)
  - Excessive Undertime Pattern (5+ occurrences in 30 days)
  - Frequent Half Day (4+ occurrences in 30 days)
- Settings page already exists at resources/js/Pages/Settings/Index.jsx with tab structure
- Violations folder exists at resources/js/Pages/Violations/ but is empty (ready for new components)
