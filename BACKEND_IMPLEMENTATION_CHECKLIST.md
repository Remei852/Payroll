# Backend Implementation Checklist

## Overview
This checklist outlines the backend work needed to support the new frontend components and validation system.

---

## Phase 1: API Endpoints

### ✅ Endpoint 1: POST /api/attendance/validate
**File**: `app/Http/Controllers/AttendanceController.php`

**Purpose**: Validate time slots against work schedule

**Implementation**:
```php
public function validate(Request $request)
{
    $validated = $request->validate([
        'slots' => 'required|array',
        'slots.morning_in' => 'nullable|date_format:H:i',
        'slots.lunch_out' => 'nullable|date_format:H:i',
        'slots.lunch_in' => 'nullable|date_format:H:i',
        'slots.afternoon_out' => 'nullable|date_format:H:i',
        'schedule_id' => 'required|exists:work_schedules,id',
    ]);

    $schedule = WorkSchedule::find($validated['schedule_id']);
    $config = new TimeSlotConfiguration($schedule);
    $validator = new AttendanceValidator($schedule, $validated['slots']);
    $result = $validator->validate();

    return response()->json($result);
}
```

**Status**: ⏳ TODO

---

### ✅ Endpoint 2: POST /api/attendance/bulk-approve
**File**: `app/Http/Controllers/AttendanceController.php`

**Purpose**: Approve multiple attendance records

**Implementation**:
```php
public function bulkApprove(Request $request)
{
    $validated = $request->validate([
        'record_ids' => 'required|array',
        'record_ids.*' => 'exists:attendance_records,id',
    ]);

    DB::transaction(function () use ($validated) {
        foreach ($validated['record_ids'] as $recordId) {
            $record = AttendanceRecord::find($recordId);
            
            $record->update([
                'validation_status' => 'valid',
                'validated_at' => now(),
                'validated_by' => auth()->id(),
            ]);

            AttendanceValidationLog::create([
                'attendance_record_id' => $recordId,
                'validation_result' => ['status' => 'approved'],
                'issues' => [],
                'passed' => true,
                'validated_by' => auth()->id(),
            ]);
        }
    });

    return response()->json(['message' => 'Records approved']);
}
```

**Status**: ⏳ TODO

---

### ✅ Endpoint 3: GET /api/payroll/{period}/validate-attendance
**File**: `app/Http/Controllers/PayrollController.php`

**Purpose**: Get validation summary for payroll period

**Implementation**:
```php
public function validateAttendance(PayrollPeriod $period)
{
    $records = AttendanceRecord::whereBetween('attendance_date', [
        $period->start_date,
        $period->end_date,
    ])->with('employee', 'schedule')->get();

    $summary = [
        'total' => $records->count(),
        'valid' => $records->where('validation_status', 'valid')->count(),
        'needs_review' => $records->where('requires_manual_review', true)->count(),
        'invalid' => $records->where('validation_status', 'invalid')->count(),
        'can_proceed' => $records->where('validation_status', '!=', 'valid')->count() === 0,
    ];

    $recordsData = $records->map(function ($record) {
        return [
            'id' => $record->id,
            'employee_id' => $record->employee_id,
            'employee_name' => $record->employee->first_name . ' ' . $record->employee->last_name,
            'employee_code' => $record->employee->employee_code,
            'department' => $record->employee->department->name,
            'attendance_date' => $record->attendance_date,
            'time_in_am' => $record->time_in_am,
            'time_out_lunch' => $record->time_out_lunch,
            'time_in_pm' => $record->time_in_pm,
            'time_out_pm' => $record->time_out_pm,
            'status' => $record->status,
            'rendered' => $record->rendered,
            'notes' => $record->notes,
            'schedule_id' => $record->schedule_id,
            'validation' => $record->validation_issues ? json_decode($record->validation_issues, true) : null,
        ];
    });

    return response()->json([
        'summary' => $summary,
        'records' => $recordsData,
    ]);
}
```

**Status**: ⏳ TODO

---

## Phase 2: Database Migrations

### ✅ Migration 1: Add Validation Fields
**File**: `database/migrations/2026_03_25_000000_add_validation_fields_to_attendance_records.php`

**Status**: ✅ DONE (if already created)

**Fields Added**:
- `validation_issues` (JSON) - Store validation errors/warnings
- `requires_manual_review` (boolean) - Flag for manual review
- `validation_status` (string) - pending, valid, invalid, corrected
- `validated_at` (timestamp) - When validated
- `validated_by` (foreign key) - Who validated

---

### ✅ Migration 2: Create Validation Logs Table
**File**: `database/migrations/2026_03_25_000001_create_attendance_validation_logs_table.php`

**Status**: ✅ DONE (if already created)

**Table Structure**:
- `id` (primary key)
- `attendance_record_id` (foreign key)
- `validation_result` (JSON)
- `issues` (JSON)
- `passed` (boolean)
- `validated_at` (timestamp)
- `validated_by` (foreign key)
- `created_at`, `updated_at`

---

## Phase 3: Model Updates

### ✅ AttendanceRecord Model
**File**: `app/Models/AttendanceRecord.php`

**Changes Needed**:
```php
class AttendanceRecord extends Model
{
    protected $fillable = [
        // ... existing fields ...
        'validation_issues',
        'requires_manual_review',
        'validation_status',
        'validated_at',
        'validated_by',
    ];

    protected $casts = [
        'validation_issues' => 'array',
        'requires_manual_review' => 'boolean',
        'validated_at' => 'datetime',
    ];

    public function validationLogs()
    {
        return $this->hasMany(AttendanceValidationLog::class);
    }

    public function validator()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
}
```

**Status**: ⏳ TODO

---

### ✅ Create AttendanceValidationLog Model
**File**: `app/Models/AttendanceValidationLog.php`

**Implementation**:
```php
class AttendanceValidationLog extends Model
{
    protected $fillable = [
        'attendance_record_id',
        'validation_result',
        'issues',
        'passed',
        'validated_at',
        'validated_by',
    ];

    protected $casts = [
        'validation_result' => 'array',
        'issues' => 'array',
        'passed' => 'boolean',
        'validated_at' => 'datetime',
    ];

    public function attendanceRecord()
    {
        return $this->belongsTo(AttendanceRecord::class);
    }

    public function validator()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
}
```

**Status**: ⏳ TODO

---

## Phase 4: Service Layer Updates

### ✅ AttendanceService Updates
**File**: `app/Services/AttendanceService.php`

**Changes Needed**:
1. Use `TimeSlotConfiguration` for all time calculations
2. Use `TimeSlotAssigner` for log assignment
3. Use `AttendanceValidator` for validation
4. Store validation results in database
5. Create audit trail for changes

**Key Methods to Update**:
- `processEmployeeLogs()` - Use new classes
- `createAttendanceRecord()` - Store validation results
- `updateAttendanceRecord()` - Track changes

**Status**: ⏳ TODO

---

## Phase 5: Routes

### ✅ Add API Routes
**File**: `routes/api.php`

**Routes to Add**:
```php
Route::middleware('auth:sanctum')->group(function () {
    // Attendance validation
    Route::post('/attendance/validate', [AttendanceController::class, 'validate']);
    Route::post('/attendance/bulk-approve', [AttendanceController::class, 'bulkApprove']);
    Route::get('/attendance/{id}/changes', [AttendanceController::class, 'getChanges']);
    
    // Payroll validation
    Route::get('/payroll/{period}/validate-attendance', [PayrollController::class, 'validateAttendance']);
});
```

**Status**: ⏳ TODO

---

### ✅ Add Web Routes
**File**: `routes/web.php`

**Routes to Add**:
```php
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/admin/attendance/bulk-review/{period}', [AttendanceController::class, 'bulkReview'])
        ->name('admin.attendance.bulk-review');
});
```

**Status**: ⏳ TODO

---

## Phase 6: Testing

### Unit Tests

**Files to Create**:
- `tests/Unit/TimeSlotConfigurationTest.php`
- `tests/Unit/TimeSlotAssignerTest.php`
- `tests/Unit/AttendanceValidatorTest.php`

**Test Cases**:
```php
// TimeSlotConfiguration Tests
- test_calculates_lunch_boundary_correctly()
- test_respects_grace_period()
- test_returns_correct_time_ranges()

// TimeSlotAssigner Tests
- test_assigns_logs_to_correct_slots()
- test_infers_types_correctly()
- test_handles_missing_logs()
- test_provides_assignment_reasoning()

// AttendanceValidator Tests
- test_detects_invalid_time_sequence()
- test_detects_duplicate_times()
- test_identifies_schedule_violations()
- test_distinguishes_errors_from_warnings()
```

**Status**: ⏳ TODO

---

### Integration Tests

**Files to Create**:
- `tests/Feature/AttendanceValidationApiTest.php`
- `tests/Feature/BulkApprovalApiTest.php`

**Test Cases**:
```php
// API Tests
- test_validate_endpoint_returns_validation_result()
- test_bulk_approve_updates_records()
- test_validation_summary_endpoint_returns_summary()
- test_unauthorized_users_cannot_approve()
```

**Status**: ⏳ TODO

---

## Implementation Order

1. **Step 1**: Create migrations (if not done)
2. **Step 2**: Create models and update existing models
3. **Step 3**: Create API endpoints
4. **Step 4**: Add routes
5. **Step 5**: Update AttendanceService
6. **Step 6**: Write and run tests
7. **Step 7**: Manual testing with frontend

---

## Verification Checklist

- [ ] All migrations run successfully
- [ ] Models created and relationships working
- [ ] API endpoints return correct responses
- [ ] Validation logic works correctly
- [ ] Bulk approval updates records
- [ ] Audit trail created for changes
- [ ] All tests pass
- [ ] Frontend components work with API
- [ ] Error handling works properly
- [ ] Performance is acceptable

---

## Estimated Time

- Phase 1 (API Endpoints): 2-3 hours
- Phase 2 (Migrations): 30 minutes
- Phase 3 (Models): 1 hour
- Phase 4 (Service Updates): 2-3 hours
- Phase 5 (Routes): 30 minutes
- Phase 6 (Testing): 3-4 hours

**Total**: 9-12 hours

---

## Notes

- Use the existing `TimeSlotConfiguration`, `TimeSlotAssigner`, and `AttendanceValidator` classes
- Follow existing code patterns and conventions
- Maintain backward compatibility where possible
- Add proper error handling and logging
- Document API responses clearly
- Test with real data before deployment

---

## Questions?

Refer to:
- `SYSTEM_OVERVIEW_AND_ERD.md` - Database structure
- `docs/improvements/IMPLEMENTATION_COMPLETE.md` - Service classes
- `WEBSITE_REVISIONS_COMPLETE.md` - Frontend requirements
