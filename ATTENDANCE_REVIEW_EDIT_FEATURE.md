# Attendance Review & Edit Feature - Requirements & Implementation Plan

## Overview

Before payroll generation, admins need to review and correct inaccurate automated attendance records. This feature allows admins to:
- View detailed attendance records for each employee
- Edit attendance data (times, status, rendered hours)
- Add notes/comments explaining corrections
- Track who made changes and when
- Regenerate payroll after corrections

---

## Current State

**What exists:**
- ✅ Attendance Records page showing summary statistics
- ✅ Detail modal showing individual records
- ✅ CSV upload functionality
- ✅ Filtering by date range, department, employee

**What's missing:**
- ❌ Edit functionality for individual records
- ❌ Notes/comments field
- ❌ Audit trail (who changed what, when)
- ❌ Ability to add/correct attendance records
- ❌ Validation before payroll generation

---

## Feature Requirements

### 1. Edit Attendance Record Modal

**Trigger:** Click "Edit" button on attendance record in detail modal

**Fields to edit:**
- `time_in_am` - Morning in time (HH:MM format)
- `time_out_lunch` - Lunch out time (HH:MM format)
- `time_in_pm` - Afternoon in time (HH:MM format)
- `time_out_pm` - Afternoon out time (HH:MM format)
- `rendered` - Workday credit (0.0 to 1.0)
- `status` - Attendance status (Present, Late, Absent, Half Day, etc.)
- `notes` - Admin notes explaining the correction

**Validation:**
- Times must be in valid HH:MM format
- Times must be in chronological order (in_am < out_lunch < in_pm < out_pm)
- Rendered must be between 0.0 and 1.0
- Status must be one of predefined values
- Notes max 500 characters

**On Save:**
- Update attendance_records table
- Create audit log entry
- Show success message
- Refresh the detail modal

### 2. Add Notes to Record

**Trigger:** Click "Add Note" button on attendance record

**Fields:**
- `notes` - Text field (max 500 characters)
- Auto-save on blur or click Save

**Display:**
- Show notes below the record
- Show who added the note and when
- Allow editing/updating notes

### 3. Audit Trail

**Track:**
- Who made the change (user_id)
- When the change was made (timestamp)
- What was changed (old value → new value)
- Why it was changed (notes field)

**Display:**
- Show in a "Change History" section
- List all changes in chronological order
- Show: "Changed by [User] on [Date] at [Time]: [Field] from [Old] to [New]"

### 4. Validation Before Payroll

**Before generating payroll:**
- Check if all records have valid data
- Flag records with missing times or invalid status
- Show warning if records were recently edited
- Require confirmation before proceeding

---

## Database Changes Required

### 1. Add Notes Column to attendance_records

```php
Schema::table('attendance_records', function (Blueprint $table) {
    $table->text('notes')->nullable()->after('confidence_score');
    $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
    $table->timestamp('reviewed_at')->nullable();
});
```

### 2. Create attendance_record_changes Table (Audit Trail)

```php
Schema::create('attendance_record_changes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('attendance_record_id')->constrained()->onDelete('cascade');
    $table->foreignId('changed_by')->constrained('users')->onDelete('set null');
    $table->string('field_name'); // e.g., 'time_in_am', 'status', 'notes'
    $table->text('old_value')->nullable();
    $table->text('new_value')->nullable();
    $table->text('reason')->nullable(); // Admin's explanation
    $table->timestamps();
    
    $table->index(['attendance_record_id', 'created_at']);
});
```

---

## API Endpoints Required

### 1. Get Attendance Record Details
```
GET /api/attendance/records/{id}
Response: {
    id, employee_id, attendance_date, time_in_am, time_out_lunch,
    time_in_pm, time_out_pm, rendered, status, notes, reviewed_by,
    reviewed_at, changes: [...]
}
```

### 2. Update Attendance Record
```
PATCH /api/attendance/records/{id}
Request: {
    time_in_am, time_out_lunch, time_in_pm, time_out_pm,
    rendered, status, notes, reason
}
Response: { success, message, record }
```

### 3. Add Note to Record
```
POST /api/attendance/records/{id}/notes
Request: { notes }
Response: { success, message }
```

### 4. Get Change History
```
GET /api/attendance/records/{id}/changes
Response: [
    { id, field_name, old_value, new_value, reason, changed_by, created_at },
    ...
]
```

### 5. Validate Records Before Payroll
```
POST /api/attendance/validate-for-payroll
Request: { payroll_period_id }
Response: {
    valid: boolean,
    issues: [
        { record_id, employee_id, issue_type, message }
    ]
}
```

---

## Frontend Components

### 1. AttendanceRecordEditModal
- Modal for editing a single attendance record
- Form with time inputs, status dropdown, notes textarea
- Validation feedback
- Save/Cancel buttons

### 2. ChangeHistoryPanel
- Shows all changes made to a record
- Displays: who, when, what changed, why
- Collapsible/expandable

### 3. AttendanceValidationWarning
- Shows before payroll generation
- Lists any issues found
- Allows user to go back and fix or proceed anyway

### 4. NotesSection
- Display existing notes
- Add/edit notes button
- Show who added note and when

---

## User Workflow

### Scenario: Correcting Inaccurate Attendance

```
1. Admin navigates to Attendance Records
2. Sees employee with "Missing Logs" or "Late" status
3. Clicks "View Details" to see daily records
4. Finds record with incorrect times (e.g., time_in_am is NULL)
5. Clicks "Edit" on that record
6. Opens edit modal
7. Enters correct times: 08:00, 12:00, 13:00, 17:00
8. Changes status from "Missed Log" to "Present"
9. Adds note: "Employee was present, logs were not recorded. Verified with employee."
10. Clicks "Save"
11. System validates times are in order
12. Updates record in database
13. Creates audit log entry
14. Shows success message
15. Refreshes detail modal showing updated record
16. Shows change history: "Changed by Admin on 2026-03-16 at 10:30: time_in_am from NULL to 08:00"
17. Admin can now proceed to generate payroll with corrected data
```

---

## Implementation Checklist

### Backend
- [ ] Create migration for notes column
- [ ] Create migration for attendance_record_changes table
- [ ] Update AttendanceRecord model with relationships
- [ ] Create AttendanceRecordChange model
- [ ] Add validation rules for attendance record updates
- [ ] Implement update endpoint in AttendanceController
- [ ] Implement notes endpoint
- [ ] Implement change history endpoint
- [ ] Implement validation endpoint for payroll
- [ ] Add audit logging to all changes

### Frontend
- [ ] Create AttendanceRecordEditModal component
- [ ] Create ChangeHistoryPanel component
- [ ] Create NotesSection component
- [ ] Add "Edit" button to detail modal
- [ ] Add "Add Note" button to detail modal
- [ ] Add change history display
- [ ] Add validation warning before payroll
- [ ] Handle form submission and error display
- [ ] Add loading states

### Testing
- [ ] Test time validation (chronological order)
- [ ] Test rendered hours validation (0.0-1.0)
- [ ] Test status validation
- [ ] Test audit trail creation
- [ ] Test notes persistence
- [ ] Test payroll validation
- [ ] Test concurrent edits (if applicable)

---

## Data Validation Rules

### Time Fields
- Format: HH:MM (24-hour)
- Range: 00:00 to 23:59
- Chronological: time_in_am < time_out_lunch < time_in_pm < time_out_pm
- All times optional (can be NULL for absent days)

### Rendered Field
- Type: Float
- Range: 0.0 to 1.0
- Precision: 2 decimal places
- Calculated from times if not manually set

### Status Field
- Enum: Present, Late, Absent, Half Day, Undertime, Overtime, etc.
- Must match predefined list
- Auto-calculated based on times if not manually set

### Notes Field
- Type: Text
- Max length: 500 characters
- Optional
- Searchable/filterable

---

## Security Considerations

### Access Control
- Only HR/Admin roles can edit attendance
- Employees cannot edit their own records
- Implement permission checks on all endpoints

### Audit Trail
- All changes must be logged
- Cannot delete change history
- Show who made each change
- Timestamp all changes

### Data Integrity
- Validate all inputs server-side
- Prevent invalid state transitions
- Maintain referential integrity
- Use transactions for multi-step updates

---

## Performance Considerations

### Queries
- Index on attendance_record_id for changes table
- Index on employee_id, attendance_date for records
- Eager load relationships (employee, changes, user)

### Caching
- Invalidate payroll cache when records are edited
- Clear employee summary cache
- Refresh violation detection if needed

### Batch Operations
- Allow bulk edit for multiple records
- Bulk add notes
- Bulk status changes

---

## Future Enhancements

1. **Bulk Edit** - Edit multiple records at once
2. **Template Notes** - Pre-defined note templates
3. **Auto-Correct** - Suggest corrections based on patterns
4. **Approval Workflow** - Require approval for edits
5. **Comparison View** - Show before/after side-by-side
6. **Export Changes** - Export audit trail as report
7. **Undo/Redo** - Revert changes
8. **Notifications** - Alert when records are edited

---

## Success Criteria

✅ Admins can edit attendance records before payroll
✅ All changes are tracked with audit trail
✅ Notes explain why changes were made
✅ Validation prevents invalid data
✅ Payroll generation uses corrected data
✅ Change history is visible and searchable
✅ System prevents accidental data loss
✅ Performance is acceptable (< 200ms for updates)
