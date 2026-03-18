# Attendance Manual Adjustment Feature

## Overview
Add capability for HR/Admin to manually adjust attendance records when there are valid reasons (device malfunction, forgot to set up overrides, employee explanations, etc.).

## Why This Feature is Important

### Real-World Scenarios:
1. **Forgot Sunday Work Override** - Employee worked Sunday but no override was set up in Settings
2. **Missed Logs with Explanation** - Employee forgot to clock out but has proof of work
3. **Biometric Device Issues** - Device malfunction didn't record logs
4. **Wrong Clock-In Time** - Employee accidentally clocked in at wrong device/time
5. **Administrative Corrections** - HR needs to fix errors after investigation

## Recommended Approach: Manual Adjustment System

### Key Principles:
1. **Preserve Original Data** - Never delete calculated attendance data
2. **Audit Trail** - Track who made changes, when, and why
3. **Transparency** - Show both original and adjusted values
4. **Approval Workflow** - Optional approval process for adjustments
5. **Justification Required** - Every adjustment must have a reason

## Database Design

### New Table: `attendance_adjustments`

```sql
- id
- attendance_record_id (FK to attendance_records)
- adjusted_by (FK to users - who made the adjustment)
- adjustment_type (enum: time_correction, missed_log_fix, status_override, late_excuse, manual_entry, other)

-- Original values (before adjustment)
- original_time_in_am
- original_time_out_lunch
- original_time_in_pm
- original_time_out_pm
- original_status
- original_late_minutes
- original_workday_rendered

-- Adjusted values (after adjustment)
- adjusted_time_in_am
- adjusted_time_out_lunch
- adjusted_time_in_pm
- adjusted_time_out_pm
- adjusted_status
- adjusted_late_minutes
- adjusted_workday_rendered

-- Justification
- reason (text - required)
- supporting_documents (text - optional file references)

-- Approval workflow (optional)
- approval_status (enum: pending, approved, rejected)
- approved_by (FK to users)
- approved_at (timestamp)

- created_at
- updated_at
```

## UI/UX Design

### 1. Attendance Records Page - Add Edit Button

In the detail modal, add an "Edit" button next to each record row:

```
[Date] [Times] [Status] [Actions: 👁️ View | ✏️ Edit]
```

### 2. Edit Modal

When clicking "Edit", open a modal with:

**Section 1: Current (Calculated) Values**
```
Current Status: Missed Log, Late
Time In AM: 08:24:28
Time Out Lunch: -
Time In PM: -
Time Out PM: 16:59:50
Late Minutes: 24
Workday Rendered: 1.00
```

**Section 2: Adjustment Form**
```
Adjustment Type: [Dropdown]
  - Time Correction
  - Missed Log Fix
  - Status Override
  - Late Excuse
  - Manual Entry
  - Other

Adjusted Values:
  Time In AM: [Input] 08:24:28
  Time Out Lunch: [Input] 12:00:00  ← Can edit
  Time In PM: [Input] 13:00:00      ← Can edit
  Time Out PM: [Input] 16:59:50
  
  Status: [Dropdown]
    - Present
    - Late
    - Absent
    - Half Day
    - etc.
  
  Late Minutes: [Input] 0  ← Can override
  Workday Rendered: [Input] 1.00

Reason for Adjustment: [Textarea - Required]
  "Employee forgot to clock out for lunch. Confirmed with supervisor that employee took standard 1-hour lunch break."

Supporting Documents: [File Upload - Optional]
  Upload proof (emails, forms, etc.)

[Cancel] [Save Adjustment]
```

**Section 3: Adjustment History** (if adjustments exist)
```
Previous Adjustments:
1. Feb 15, 2026 10:30 AM by Admin User
   Type: Missed Log Fix
   Reason: "Device malfunction confirmed by IT"
   Status: Approved by HR Manager
```

### 3. Visual Indicators

In the attendance records table, show indicators for adjusted records:

```
✏️ 2/15/2026  08:24:28  12:00:00  13:00:00  16:59:50  [Adjusted]
```

Hover tooltip: "This record has been manually adjusted. Click to view details."

### 4. Reports

In reports and summaries, use adjusted values when they exist:

```
Employee: John Doe
Total Workdays: 20 (18 calculated + 2 adjusted)
Total Late: 45 minutes (60 calculated - 15 excused)
```

## Backend Implementation

### 1. Model: AttendanceAdjustment

```php
class AttendanceAdjustment extends Model
{
    protected $fillable = [
        'attendance_record_id',
        'adjusted_by',
        'adjustment_type',
        'original_*',
        'adjusted_*',
        'reason',
        'supporting_documents',
        'approval_status',
        'approved_by',
        'approved_at',
    ];
    
    public function attendanceRecord()
    {
        return $this->belongsTo(AttendanceRecord::class);
    }
    
    public function adjustedBy()
    {
        return $this->belongsTo(User::class, 'adjusted_by');
    }
    
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
```

### 2. Update AttendanceRecord Model

```php
class AttendanceRecord extends Model
{
    public function adjustment()
    {
        return $this->hasOne(AttendanceAdjustment::class)
            ->where('approval_status', 'approved')
            ->latest();
    }
    
    public function adjustments()
    {
        return $this->hasMany(AttendanceAdjustment::class);
    }
    
    // Get effective values (adjusted if exists, otherwise original)
    public function getEffectiveTimeInAmAttribute()
    {
        return $this->adjustment?->adjusted_time_in_am ?? $this->time_in_am;
    }
    
    public function getEffectiveStatusAttribute()
    {
        return $this->adjustment?->adjusted_status ?? $this->status;
    }
    
    // ... similar for other fields
}
```

### 3. Controller: AttendanceAdjustmentController

```php
class AttendanceAdjustmentController extends Controller
{
    public function store(Request $request, AttendanceRecord $record)
    {
        $validated = $request->validate([
            'adjustment_type' => 'required|in:time_correction,missed_log_fix,status_override,late_excuse,manual_entry,other',
            'adjusted_time_in_am' => 'nullable|date_format:H:i:s',
            'adjusted_time_out_lunch' => 'nullable|date_format:H:i:s',
            'adjusted_time_in_pm' => 'nullable|date_format:H:i:s',
            'adjusted_time_out_pm' => 'nullable|date_format:H:i:s',
            'adjusted_status' => 'required|string',
            'adjusted_late_minutes' => 'required|integer|min:0',
            'adjusted_workday_rendered' => 'required|numeric|min:0|max:1',
            'reason' => 'required|string|min:10',
            'supporting_documents' => 'nullable|string',
        ]);
        
        // Store original values
        $adjustment = $record->adjustments()->create([
            'adjusted_by' => auth()->id(),
            'adjustment_type' => $validated['adjustment_type'],
            
            // Original values
            'original_time_in_am' => $record->time_in_am,
            'original_time_out_lunch' => $record->time_out_lunch,
            'original_time_in_pm' => $record->time_in_pm,
            'original_time_out_pm' => $record->time_out_pm,
            'original_status' => $record->status,
            'original_late_minutes' => $record->total_late_minutes,
            'original_workday_rendered' => $record->workday_rendered,
            
            // Adjusted values
            'adjusted_time_in_am' => $validated['adjusted_time_in_am'],
            'adjusted_time_out_lunch' => $validated['adjusted_time_out_lunch'],
            'adjusted_time_in_pm' => $validated['adjusted_time_in_pm'],
            'adjusted_time_out_pm' => $validated['adjusted_time_out_pm'],
            'adjusted_status' => $validated['adjusted_status'],
            'adjusted_late_minutes' => $validated['adjusted_late_minutes'],
            'adjusted_workday_rendered' => $validated['adjusted_workday_rendered'],
            
            'reason' => $validated['reason'],
            'supporting_documents' => $validated['supporting_documents'],
            'approval_status' => 'approved', // Auto-approve or set to 'pending'
        ]);
        
        return back()->with('success', 'Attendance record adjusted successfully');
    }
    
    public function approve(AttendanceAdjustment $adjustment)
    {
        $adjustment->update([
            'approval_status' => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);
        
        return back()->with('success', 'Adjustment approved');
    }
    
    public function reject(AttendanceAdjustment $adjustment)
    {
        $adjustment->update([
            'approval_status' => 'rejected',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);
        
        return back()->with('success', 'Adjustment rejected');
    }
}
```

### 4. Update AttendanceService

Modify `getAttendanceSummary()` to use adjusted values:

```php
public function getAttendanceSummary(): array
{
    $records = AttendanceRecord::with(['employee.department', 'adjustment'])
        ->get()
        ->groupBy('employee_id');

    foreach ($records as $employeeId => $employeeRecords) {
        // Use effective values (adjusted if exists)
        $totalWorkdays = $employeeRecords->sum(function($r) {
            return $r->adjustment?->adjusted_workday_rendered ?? $r->workday_rendered;
        });
        
        $totalLateMinutes = $employeeRecords->sum(function($r) {
            return $r->adjustment?->adjusted_late_minutes ?? $r->total_late_minutes;
        });
        
        // ... etc
    }
}
```

## Permissions & Security

### Role-Based Access:
- **HR/Admin**: Can create and approve adjustments
- **Supervisor**: Can create adjustments (pending approval)
- **Employee**: Can view their own adjustment history (read-only)

### Validation Rules:
1. Adjusted times must be within the attendance date
2. Adjusted workday_rendered must be between 0 and 1
3. Reason must be at least 10 characters
4. Cannot adjust records older than X days (configurable)

## Alternative: Quick Actions

For common scenarios, add quick action buttons:

```
[Excuse Late] - Sets late minutes to 0 with reason
[Mark Present] - Overrides Absent to Present
[Add Missing Logs] - Opens form to add missing clock times
[Sunday Work] - Applies Sunday work override retroactively
```

## Migration Path

### Phase 1: Database Setup
1. Run migration to create `attendance_adjustments` table
2. Create AttendanceAdjustment model

### Phase 2: Backend
1. Create AttendanceAdjustmentController
2. Add routes for adjustment CRUD
3. Update AttendanceRecord model with relationships
4. Modify AttendanceService to use adjusted values

### Phase 3: Frontend
1. Add "Edit" button to attendance detail modal
2. Create adjustment form modal
3. Add visual indicators for adjusted records
4. Show adjustment history

### Phase 4: Testing
1. Test adjustment creation
2. Test approval workflow
3. Test reports with adjusted values
4. Test permissions

## Benefits

1. **Flexibility** - Handle real-world exceptions without breaking the system
2. **Accountability** - Full audit trail of all changes
3. **Transparency** - Both original and adjusted values are visible
4. **Compliance** - Meets labor law requirements for record keeping
5. **Trust** - Employees can see adjustments made to their records

## Considerations

1. **Approval Workflow** - Decide if adjustments need approval or are auto-approved
2. **Time Limit** - Set a deadline for adjustments (e.g., can't adjust records older than 30 days)
3. **Bulk Adjustments** - Consider adding bulk adjustment for multiple employees (e.g., forgot to set up Sunday work for entire department)
4. **Notifications** - Notify employees when their records are adjusted
5. **Export** - Ensure exports include adjustment information

## Recommendation

**YES, implement this feature.** It's essential for real-world HR operations. Start with:

1. Create the migration (already done above)
2. Build the basic adjustment form in the modal
3. Add simple approval workflow
4. Expand with more features as needed

The system will be much more practical and usable with this capability.
