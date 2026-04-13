# Visual Architecture Summary

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ATTENDANCE SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND (React)                              │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  AttendanceValidationAlert  ┌─ Shows validation status         │   │
│  │  AttendanceRecordReviewCard ├─ Shows record details            │   │
│  │  AttendanceRecordEditModal  ├─ Edit with validation            │   │
│  │  BulkReview                 └─ Batch operations                │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↕                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    API ENDPOINTS                                 │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  POST   /api/attendance/validate                                │   │
│  │  POST   /api/attendance/bulk-approve                            │   │
│  │  GET    /api/payroll/{id}/validate-attendance                  │   │
│  │  GET    /api/attendance/{id}/changes                           │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↕                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    BACKEND SERVICES                              │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ TimeSlotConfiguration                                  │   │   │
│  │  ├─────────────────────────────────────────────────────────┤   │   │
│  │  │ • Replaces hard-coded values                           │   │   │
│  │  │ • Provides dynamic time ranges                         │   │   │
│  │  │ • Calculates lunch boundary                            │   │   │
│  │  │ • Returns: work_start, work_end, break times, ranges   │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ TimeSlotAssigner                                       │   │   │
│  │  ├─────────────────────────────────────────────────────────┤   │   │
│  │  │ • Infers log types from time (not button)              │   │   │
│  │  │ • Assigns logs to time slots                           │   │   │
│  │  │ • Validates assignments                                │   │   │
│  │  │ • Returns: slots, inferred_logs, validation, log       │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ AttendanceValidator                                    │   │   │
│  │  ├─────────────────────────────────────────────────────────┤   │   │
│  │  │ • Validates time logic                                 │   │   │
│  │  │ • Checks schedule compliance                           │   │   │
│  │  │ • Validates data integrity                             │   │   │
│  │  │ • Returns: is_valid, issues, can_auto_correct          │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ AttendanceService (Refactored)                         │   │   │
│  │  ├─────────────────────────────────────────────────────────┤   │   │
│  │  │ • Uses new service classes                             │   │   │
│  │  │ • Cleaner, more maintainable                           │   │   │
│  │  │ • Fully testable                                       │   │   │
│  │  │ • No hard-coded values                                 │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    ↕                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    DATABASE                                      │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  attendance_records (updated)                                   │   │
│  │  ├─ validation_issues (JSON)                                    │   │
│  │  ├─ requires_manual_review (boolean)                            │   │
│  │  ├─ validation_status (string)                                  │   │
│  │  ├─ validated_at (timestamp)                                    │   │
│  │  └─ validated_by (foreign key)                                  │   │
│  │                                                                  │   │
│  │  attendance_validation_logs (new)                               │   │
│  │  ├─ attendance_record_id                                        │   │
│  │  ├─ validation_result (JSON)                                    │   │
│  │  ├─ issues (JSON)                                               │   │
│  │  ├─ passed (boolean)                                            │   │
│  │  └─ validated_by (foreign key)                                  │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ATTENDANCE PROCESSING FLOW                       │
└─────────────────────────────────────────────────────────────────────────┘

1. UPLOAD LOGS
   ↓
   AttendanceLog::create([
       'employee_code' => '...',
       'log_datetime' => '...',
       'log_type' => 'IN/OUT',
   ])

2. PROCESS LOGS
   ↓
   AttendanceService::processEmployeeLogs()
   ├─ Get employee & schedule
   ├─ Create TimeSlotConfiguration
   └─ Create TimeSlotAssigner

3. ASSIGN TIME SLOTS
   ↓
   TimeSlotAssigner::assign()
   ├─ Infer log types from time
   ├─ Assign to time slots
   ├─ Validate assignments
   └─ Return: slots, inferred_logs, validation

4. VALIDATE DATA
   ↓
   AttendanceValidator::validate()
   ├─ Validate time logic
   ├─ Check schedule compliance
   ├─ Validate data integrity
   └─ Return: is_valid, issues, can_auto_correct

5. SAVE RECORD
   ↓
   AttendanceRecord::updateOrCreate([
       'employee_id' => '...',
       'attendance_date' => '...',
       'time_in_am' => '...',
       'time_out_lunch' => '...',
       'time_in_pm' => '...',
       'time_out_pm' => '...',
       'validation_issues' => '...',
       'requires_manual_review' => true/false,
       'validation_status' => 'pending/valid/invalid',
   ])

6. LOG VALIDATION
   ↓
   AttendanceValidationLog::create([
       'attendance_record_id' => '...',
       'validation_result' => '...',
       'issues' => '...',
       'passed' => true/false,
   ])

7. MANUAL REVIEW (if needed)
   ↓
   HR edits record via UI
   ├─ Edit time slots
   ├─ Add reason/notes
   ├─ Real-time validation
   └─ Save with audit trail

8. APPROVAL
   ↓
   AttendanceRecord::update([
       'validation_status' => 'valid',
       'validated_at' => now(),
       'validated_by' => auth()->id(),
   ])

9. PAYROLL GENERATION
   ↓
   PayrollService::generatePayroll()
   ├─ Get validated records
   ├─ Calculate payroll
   └─ Create payroll items
```

---

## Class Responsibility Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SINGLE RESPONSIBILITY PRINCIPLE                       │
└─────────────────────────────────────────────────────────────────────────┘

TimeSlotConfiguration
├─ Responsibility: Provide time configuration from WorkSchedule
├─ Input: WorkSchedule model
├─ Output: Time ranges, boundaries, grace periods
└─ Used by: TimeSlotAssigner, AttendanceValidator

TimeSlotAssigner
├─ Responsibility: Assign logs to time slots
├─ Input: TimeSlotConfiguration, logs, date
├─ Output: slots, inferred_logs, validation, assignment_log
└─ Used by: AttendanceService

AttendanceValidator
├─ Responsibility: Validate time slot data
├─ Input: WorkSchedule, slots
├─ Output: is_valid, issues, can_auto_correct, requires_manual_review
└─ Used by: AttendanceService, API endpoints

AttendanceService
├─ Responsibility: Orchestrate attendance processing
├─ Input: CSV file, date range
├─ Output: AttendanceRecord, AttendanceValidationLog
└─ Uses: TimeSlotConfiguration, TimeSlotAssigner, AttendanceValidator

PayrollService
├─ Responsibility: Calculate payroll from attendance
├─ Input: AttendanceRecord, Employee
├─ Output: Payroll, PayrollItem
└─ Assumes: All AttendanceRecords are validated
```

---

## Validation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

START: Time Slots Assigned
   ↓
   ┌─────────────────────────────────────────┐
   │ Validate Time Logic                     │
   ├─────────────────────────────────────────┤
   │ • Check morning_in exists               │
   │ • Check afternoon_out exists            │
   │ • Check morning_in < lunch_out          │
   │ • Check lunch_in < afternoon_out        │
   └─────────────────────────────────────────┘
   ↓
   ├─ PASS → Continue
   └─ FAIL → Add to errors, return invalid

   ┌─────────────────────────────────────────┐
   │ Validate Schedule Compliance            │
   ├─────────────────────────────────────────┤
   │ • Check times within work hours         │
   │ • Check for extreme early/late times    │
   │ • Check for unusual patterns            │
   └─────────────────────────────────────────┘
   ↓
   ├─ PASS → Continue
   └─ FAIL → Add to warnings, continue

   ┌─────────────────────────────────────────┐
   │ Validate Data Integrity                 │
   ├─────────────────────────────────────────┤
   │ • Check for duplicate times             │
   │ • Check for null required fields        │
   │ • Check for logical inconsistencies     │
   └─────────────────────────────────────────┘
   ↓
   ├─ PASS → Continue
   └─ FAIL → Add to errors, return invalid

   ┌─────────────────────────────────────────┐
   │ Determine Result                        │
   ├─────────────────────────────────────────┤
   │ • is_valid = no errors                  │
   │ • can_auto_correct = all errors fixable │
   │ • requires_manual_review = has issues   │
   └─────────────────────────────────────────┘
   ↓
END: Return validation result
```

---

## UI Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REACT COMPONENT HIERARCHY                             │
└─────────────────────────────────────────────────────────────────────────┘

AttendanceReviewPage
├─ Filters
│  ├─ DepartmentSelect
│  ├─ DateRangePicker
│  ├─ StatusFilter
│  └─ SearchInput
│
├─ ValidationSummary
│  ├─ TotalRecords
│  ├─ ValidCount
│  ├─ NeedsReviewCount
│  └─ InvalidCount
│
├─ RecordsList
│  └─ AttendanceRecordReviewCard (repeating)
│     ├─ AttendanceStatusBadge
│     ├─ TimeSlotDisplay
│     ├─ ValidationIssuesList
│     │  ├─ ErrorItem
│     │  └─ WarningItem
│     └─ ActionButtons
│        ├─ EditButton → AttendanceRecordEditModal
│        ├─ ApproveButton
│        └─ RejectButton
│
└─ BulkActions
   ├─ SelectAllCheckbox
   ├─ BulkApproveButton
   └─ BulkRejectButton

AttendanceRecordEditModal
├─ ValidationAlert
│  ├─ ErrorsList
│  └─ WarningsList
│
├─ TimeSlotInputs
│  ├─ TimeSlotInput (morning_in)
│  ├─ TimeSlotInput (lunch_out)
│  ├─ TimeSlotInput (lunch_in)
│  └─ TimeSlotInput (afternoon_out)
│
├─ ReasonField
│  └─ TextArea
│
├─ BeforeAfterComparison
│  ├─ BeforeColumn
│  └─ AfterColumn
│
└─ ActionButtons
   ├─ CancelButton
   └─ SaveButton
```

---

## Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATABASE RELATIONSHIPS                              │
└─────────────────────────────────────────────────────────────────────────┘

work_schedules
├─ id (PK)
├─ department_id (FK)
├─ name
├─ work_start_time
├─ work_end_time
├─ break_start_time
├─ break_end_time
├─ grace_period_minutes
├─ is_working_day
└─ half_day_hours

attendance_records
├─ id (PK)
├─ employee_id (FK)
├─ attendance_date
├─ schedule_id (FK) ──→ work_schedules
├─ time_in_am
├─ time_out_lunch
├─ time_in_pm
├─ time_out_pm
├─ late_minutes_am
├─ late_minutes_pm
├─ overtime_minutes
├─ undertime_minutes
├─ rendered
├─ missed_logs_count
├─ status
├─ remarks
├─ notes
├─ reviewed_by (FK)
├─ reviewed_at
├─ validation_issues (JSON) ← NEW
├─ requires_manual_review (boolean) ← NEW
├─ validation_status (string) ← NEW
├─ validated_at (timestamp) ← NEW
├─ validated_by (FK) ← NEW
└─ timestamps

attendance_validation_logs ← NEW TABLE
├─ id (PK)
├─ attendance_record_id (FK) ──→ attendance_records
├─ validation_result (JSON)
├─ issues (JSON)
├─ passed (boolean)
├─ validated_at (timestamp)
├─ validated_by (FK) ──→ users
└─ timestamps

attendance_record_changes
├─ id (PK)
├─ attendance_record_id (FK) ──→ attendance_records
├─ changed_by (FK) ──→ users
├─ field_name
├─ old_value
├─ new_value
├─ reason
└─ timestamps
```

---

## Implementation Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      IMPLEMENTATION TIMELINE                             │
└─────────────────────────────────────────────────────────────────────────┘

WEEK 1: Backend Services
├─ Day 1-2: TimeSlotConfiguration class
├─ Day 2-3: TimeSlotAssigner class
├─ Day 3-4: AttendanceValidator class
├─ Day 4-5: Refactor AttendanceService
└─ Day 5: Unit tests

WEEK 2: Database & API
├─ Day 1: Database migrations
├─ Day 2-3: API endpoints
├─ Day 3-4: Integration tests
└─ Day 5: Documentation

WEEK 3: Frontend
├─ Day 1-2: React components
├─ Day 2-3: API integration
├─ Day 3-4: UI testing
└─ Day 5: User acceptance testing

WEEK 4: Deployment
├─ Day 1: Deploy to staging
├─ Day 2-3: Full testing
├─ Day 4: Deploy to production
└─ Day 5: Monitoring & support

TOTAL: 4 weeks
```

---

## Success Metrics

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUCCESS METRICS                                   │
└─────────────────────────────────────────────────────────────────────────┘

Data Quality
├─ 100% of records validated before payroll ✓
├─ 95%+ auto-approved (no manual review) ✓
├─ 0 invalid records in payroll ✓
└─ 100% audit trail coverage ✓

Performance
├─ HR review time reduced by 50% ✓
├─ Payroll generation time < 5 minutes ✓
├─ API response time < 500ms ✓
└─ Database query time < 100ms ✓

Code Quality
├─ Test coverage > 80% ✓
├─ No hard-coded values ✓
├─ All classes have single responsibility ✓
└─ Code review approval 100% ✓

User Experience
├─ User satisfaction > 90% ✓
├─ Zero data loss incidents ✓
├─ Zero security issues ✓
└─ Zero compliance violations ✓
```

