# Quick Reference Guide

## Problem → Solution Mapping

| Problem | Solution | File | Benefit |
|---------|----------|------|---------|
| Hard-coded lunch times | TimeSlotConfiguration | `app/Services/TimeSlotConfiguration.php` | Dynamic, flexible |
| Hard-coded grace period | TimeSlotConfiguration | `app/Services/TimeSlotConfiguration.php` | Per-department config |
| Complex assignment logic | TimeSlotAssigner | `app/Services/TimeSlotAssigner.php` | Clean, testable |
| No data validation | AttendanceValidator | `app/Services/AttendanceValidator.php` | Data integrity |
| No user corrections | Edit Modal + API | `resources/js/Components/AttendanceRecordEditModal.jsx` | User-friendly |
| No audit trail | Change tracking | `app/Models/AttendanceRecordChange.php` | Full accountability |

---

## File Structure

```
app/Services/
├── TimeSlotConfiguration.php      (NEW) - Dynamic time config
├── TimeSlotAssigner.php           (NEW) - Log assignment logic
├── AttendanceValidator.php        (NEW) - Data validation
├── AttendanceService.php          (REFACTORED) - Cleaner, uses new classes
└── PayrollService.php             (UNCHANGED)

app/Http/Controllers/
├── AttendanceController.php       (UPDATED) - New validation endpoints
└── PayrollController.php          (UPDATED) - Validation summary endpoint

resources/js/Components/
├── AttendanceValidationAlert.jsx  (NEW) - Shows validation status
├── AttendanceRecordReviewCard.jsx (NEW) - Record review card
├── TimeSlotInput.jsx              (NEW) - Time input component
└── AttendanceRecordEditModal.jsx  (UPDATED) - Enhanced with validation

resources/js/Pages/
├── Attendance/BulkReview.jsx      (NEW) - Bulk review interface
└── Payroll/Step2ValidateAttendance.jsx (UPDATED) - Validation step

database/migrations/
├── 2026_03_25_000000_add_validation_fields_to_attendance_records.php (NEW)
└── 2026_03_25_000001_create_attendance_validation_log_table.php (NEW)
```

---

## Key Classes & Methods

### TimeSlotConfiguration

```php
$config = new TimeSlotConfiguration($schedule);

// Get individual values
$config->getWorkStartMinutes();        // 480 (8:00 AM)
$config->getWorkEndMinutes();          // 1020 (5:00 PM)
$config->getBreakStartMinutes();       // 720 (12:00 PM)
$config->getBreakEndMinutes();         // 780 (1:00 PM)
$config->getLunchBoundaryMinutes();    // 750 (12:30 PM)
$config->getGracePeriodMinutes();      // 15

// Get all ranges
$ranges = $config->getTimeSlotRanges();
// Returns: morning_in, lunch_out, lunch_in, afternoon_out ranges
```

### TimeSlotAssigner

```php
$assigner = new TimeSlotAssigner($config, $logs, $date);
$result = $assigner->assign();

// Result structure
$result['slots'] = [
    'morning_in' => '08:05',
    'lunch_out' => '12:00',
    'lunch_in' => '13:00',
    'afternoon_out' => '17:30',
];

$result['inferred_logs'] = [
    ['datetime' => ..., 'type' => 'IN', 'corrected' => false, 'reason' => '...'],
    ...
];

$result['validation'] = [
    'is_valid' => true,
    'warnings' => [],
    'errors' => [],
];

$result['assignment_log'] = [
    'Log 1: Corrected from OUT to IN',
    'Assigned 08:05 to morning_in',
    ...
];
```

### AttendanceValidator

```php
$validator = new AttendanceValidator($schedule, $slots);
$result = $validator->validate();

// Result structure
$result['is_valid'] = true/false;
$result['issues'] = [
    'errors' => [
        [
            'field' => 'morning_in',
            'message' => 'No morning IN time recorded',
            'severity' => 'critical',
            'auto_correctable' => false,
        ],
    ],
    'warnings' => [
        [
            'field' => 'afternoon_out',
            'message' => 'Employee worked very late',
            'severity' => 'warning',
            'auto_correctable' => false,
        ],
    ],
];
$result['can_auto_correct'] = true/false;
$result['requires_manual_review'] = true/false;
```

---

## API Endpoints

### POST /api/attendance/validate
Validate time slots

**Request**:
```json
{
    "slots": {
        "morning_in": "08:05",
        "lunch_out": "12:00",
        "lunch_in": "13:00",
        "afternoon_out": "17:30"
    },
    "schedule_id": 1
}
```

**Response**:
```json
{
    "is_valid": true,
    "issues": {...},
    "can_auto_correct": false,
    "requires_manual_review": false
}
```

### POST /api/attendance/bulk-approve
Approve multiple records

**Request**:
```json
{
    "record_ids": [1, 2, 3, 4, 5]
}
```

**Response**:
```json
{
    "message": "Records approved"
}
```

### GET /api/payroll/{id}/validate-attendance
Get validation summary for payroll period

**Response**:
```json
{
    "summary": {
        "total": 50,
        "valid": 48,
        "needs_review": 2,
        "invalid": 0,
        "can_proceed": false
    },
    "records": [...]
}
```

---

## React Components

### AttendanceValidationAlert

```jsx
<AttendanceValidationAlert validation={validation} />
```

Shows validation status with errors and warnings.

### AttendanceRecordReviewCard

```jsx
<AttendanceRecordReviewCard
    record={record}
    onEdit={handleEdit}
    onApprove={handleApprove}
    onReject={handleReject}
/>
```

Shows record details with action buttons.

### TimeSlotInput

```jsx
<TimeSlotInput
    label="Morning IN"
    value={time}
    onChange={handleChange}
    required={true}
/>
```

Time input with validation.

### AttendanceRecordEditModal

```jsx
<AttendanceRecordEditModal
    record={record}
    onSave={handleSave}
    onClose={handleClose}
/>
```

Full edit interface with validation and audit trail.

---

## Database Schema Changes

### attendance_records (new fields)

```sql
ALTER TABLE attendance_records ADD COLUMN validation_issues JSON;
ALTER TABLE attendance_records ADD COLUMN requires_manual_review BOOLEAN DEFAULT false;
ALTER TABLE attendance_records ADD COLUMN validation_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE attendance_records ADD COLUMN validated_at TIMESTAMP NULL;
ALTER TABLE attendance_records ADD COLUMN validated_by BIGINT UNSIGNED NULL;
```

### attendance_validation_logs (new table)

```sql
CREATE TABLE attendance_validation_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    attendance_record_id BIGINT UNSIGNED NOT NULL,
    validation_result JSON NOT NULL,
    issues JSON NOT NULL,
    passed BOOLEAN NOT NULL,
    validated_at TIMESTAMP NOT NULL,
    validated_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id),
    FOREIGN KEY (validated_by) REFERENCES users(id),
    INDEX (attendance_record_id, validated_at)
);
```

---

## Testing Checklist

### Unit Tests
- [ ] TimeSlotConfiguration calculates times correctly
- [ ] TimeSlotConfiguration respects grace period
- [ ] TimeSlotAssigner assigns logs to correct slots
- [ ] TimeSlotAssigner infers types correctly
- [ ] AttendanceValidator detects invalid sequences
- [ ] AttendanceValidator identifies auto-correctable issues

### Integration Tests
- [ ] Full attendance processing flow
- [ ] Validation before payroll generation
- [ ] Bulk approval workflow
- [ ] Audit trail recording

### UI Tests
- [ ] Validation alert displays correctly
- [ ] Edit modal validates in real-time
- [ ] Bulk review interface works
- [ ] Before/after comparison shows correctly

---

## Deployment Checklist

- [ ] Code review completed
- [ ] All tests passing
- [ ] Database migrations tested
- [ ] API endpoints tested
- [ ] Frontend components tested
- [ ] User acceptance testing completed
- [ ] Documentation updated
- [ ] Rollback plan prepared
- [ ] Monitoring set up
- [ ] Deploy to staging
- [ ] Final testing on staging
- [ ] Deploy to production
- [ ] Monitor for issues

---

## Common Issues & Solutions

### Issue: Validation always fails
**Solution**: Check WorkSchedule times are valid (start < end, break within work hours)

### Issue: Time slots not assigned correctly
**Solution**: Check log times are within expected ranges, review assignment_log

### Issue: Performance slow
**Solution**: Add indexes on attendance_records (attendance_date, validation_status)

### Issue: Audit trail missing
**Solution**: Ensure AttendanceRecordChange is created for each edit

---

## Performance Optimization

### Indexes to Add
```sql
CREATE INDEX idx_attendance_validation_status 
ON attendance_records(validation_status);

CREATE INDEX idx_attendance_requires_review 
ON attendance_records(requires_manual_review);

CREATE INDEX idx_validation_logs_record 
ON attendance_validation_logs(attendance_record_id, validated_at);
```

### Query Optimization
- Use eager loading for relationships
- Cache TimeSlotConfiguration per schedule
- Batch validate records
- Use database transactions

---

## Monitoring & Alerts

### Metrics to Track
- Validation pass rate (target: 95%+)
- Manual review rate (target: <5%)
- Average review time per record
- Payroll generation time
- Data integrity issues

### Alerts to Set Up
- Validation pass rate drops below 90%
- Manual review rate exceeds 10%
- Payroll generation fails
- Audit trail missing for changes

