# Implementation Guide: Clean, Efficient Code

---

## PHASE 1: REFACTOR ATTENDANCE SERVICE

### Step 1: Create TimeSlotConfiguration Class

**File**: `app/Services/TimeSlotConfiguration.php`

This class replaces all hard-coded time values with dynamic configuration based on WorkSchedule.

**Benefits**:
- Single source of truth for time calculations
- Easy to test
- Reusable across services
- No hard-coded values

### Step 2: Create TimeSlotAssigner Class

**File**: `app/Services/TimeSlotAssigner.php`

This class handles the complex logic of assigning logs to time slots.

**Benefits**:
- Separated concern (assignment logic)
- Testable in isolation
- Clear assignment reasoning
- Audit trail of decisions

### Step 3: Create AttendanceValidator Class

**File**: `app/Services/AttendanceValidator.php`

This class validates attendance data for integrity.

**Benefits**:
- Comprehensive validation
- Clear error messages
- Distinguishes errors from warnings
- Identifies auto-correctable issues

### Step 4: Refactor AttendanceService

**Before** (1953 lines, hard-coded values):
```php
class AttendanceService
{
    private const GRACE_PERIOD_MINUTES = 15;
    private const LUNCH_BREAK_START = '12:00:00';
    
    private function assignLogsToTimeSlots(array $logs, Carbon $date): array
    {
        $lunchBoundary = 765; // Hard-coded
        // ... 100+ lines of complex logic
    }
}
```

**After** (Refactored, clean):
```php
class AttendanceService
{
    private TimeSlotAssigner $assigner;
    private AttendanceValidator $validator;

    public function processEmployeeLogs(string $employeeCode, Carbon $date, $logs): void
    {
        $employee = Employee::with('department.workSchedule')->find($employeeCode);
        $schedule = $this->getScheduleForEmployee($employee, $date);

        // Step 1: Assign logs to time slots
        $assignment = $this->assigner->assign();
        $slots = $assignment['slots'];

        // Step 2: Validate assignments
        $validation = $this->validator->validate();

        if (!$validation['is_valid']) {
            // Handle validation errors
            $this->logValidationIssues($employee, $date, $validation);
            return;
        }

        // Step 3: Create attendance record
        $this->createAttendanceRecord($employee, $date, $slots);
    }
}
```

---

## PHASE 2: DATABASE MIGRATIONS

### Migration 1: Add Validation Fields to AttendanceRecords

```php
// database/migrations/2026_03_25_000000_add_validation_fields_to_attendance_records.php
Schema::table('attendance_records', function (Blueprint $table) {
    $table->json('validation_issues')->nullable(); // Store validation errors/warnings
    $table->boolean('requires_manual_review')->default(false);
    $table->string('validation_status')->default('pending'); // pending, valid, invalid, corrected
    $table->timestamp('validated_at')->nullable();
    $table->foreignId('validated_by')->nullable()->constrained('users');
});
```

### Migration 2: Create AttendanceValidationLog Table

```php
// database/migrations/2026_03_25_000001_create_attendance_validation_log_table.php
Schema::create('attendance_validation_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('attendance_record_id')->constrained('attendance_records')->onDelete('cascade');
    $table->json('validation_result'); // Full validation result
    $table->json('issues'); // Errors and warnings
    $table->boolean('passed'); // Whether validation passed
    $table->timestamp('validated_at');
    $table->foreignId('validated_by')->nullable()->constrained('users');
    $table->timestamps();

    $table->index(['attendance_record_id', 'validated_at']);
});
```

---

## PHASE 3: API ENDPOINTS

### Endpoint 1: Validate Attendance

```php
// app/Http/Controllers/AttendanceController.php
public function validate(Request $request)
{
    $validated = $request->validate([
        'slots' => 'required|array',
        'slots.morning_in' => 'nullable|date_format:H:i:s',
        'slots.lunch_out' => 'nullable|date_format:H:i:s',
        'slots.lunch_in' => 'nullable|date_format:H:i:s',
        'slots.afternoon_out' => 'nullable|date_format:H:i:s',
        'schedule_id' => 'required|exists:work_schedules,id',
    ]);

    $schedule = WorkSchedule::find($validated['schedule_id']);
    $validator = new AttendanceValidator($schedule, $validated['slots']);
    $result = $validator->validate();

    return response()->json($result);
}
```

### Endpoint 2: Bulk Approve Records

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

### Endpoint 3: Get Validation Summary

```php
public function getValidationSummary(PayrollPeriod $period)
{
    $records = AttendanceRecord::whereBetween('attendance_date', [
        $period->start_date,
        $period->end_date,
    ])->get();

    $summary = [
        'total' => $records->count(),
        'valid' => $records->where('validation_status', 'valid')->count(),
        'needs_review' => $records->where('requires_manual_review', true)->count(),
        'invalid' => $records->where('validation_status', 'invalid')->count(),
        'can_proceed' => $records->where('requires_manual_review', true)->count() === 0,
    ];

    return response()->json([
        'summary' => $summary,
        'records' => $records->map(fn($r) => [
            'id' => $r->id,
            'employee_name' => $r->employee->full_name,
            'attendance_date' => $r->attendance_date,
            'validation_status' => $r->validation_status,
            'issues' => $r->validation_issues,
            'requires_review' => $r->requires_manual_review,
        ]),
    ]);
}
```

---

## PHASE 4: FRONTEND COMPONENTS

### Component 1: AttendanceValidationAlert

```jsx
// resources/js/Components/AttendanceValidationAlert.jsx
export default function AttendanceValidationAlert({ validation }) {
  if (validation.is_valid) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4 flex items-center gap-2">
        <span className="text-green-600 text-xl">✓</span>
        <span className="text-green-800">All validations passed</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {validation.issues.errors?.map((error, idx) => (
        <div key={idx} className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
          <span className="text-red-600 flex-shrink-0">✕</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{error.message}</p>
            <p className="text-xs text-red-600 mt-1">
              {error.auto_correctable ? '(Can be auto-corrected)' : '(Requires manual review)'}
            </p>
          </div>
        </div>
      ))}

      {validation.issues.warnings?.map((warning, idx) => (
        <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3 flex gap-2">
          <span className="text-yellow-600 flex-shrink-0">⚠️</span>
          <p className="text-sm text-yellow-800">{warning.message}</p>
        </div>
      ))}
    </div>
  );
}
```

### Component 2: TimeSlotInput

```jsx
// resources/js/Components/TimeSlotInput.jsx
export default function TimeSlotInput({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-600">*</span>}
      </label>
      <input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
```

### Component 3: AttendanceRecordReviewCard

```jsx
// resources/js/Components/AttendanceRecordReviewCard.jsx
export default function AttendanceRecordReviewCard({
  record,
  onEdit,
  onApprove,
  onReject,
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold">{record.employee_name}</h3>
          <p className="text-sm text-gray-600">{record.attendance_date}</p>
        </div>
        <AttendanceStatusBadge validation={record.validation} />
      </div>

      {/* Time Slots */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <span className="text-gray-600">Morning IN:</span>
          <span className="ml-2 font-mono">{record.time_in_am || '—'}</span>
        </div>
        <div>
          <span className="text-gray-600">Lunch OUT:</span>
          <span className="ml-2 font-mono">{record.time_out_lunch || '—'}</span>
        </div>
        <div>
          <span className="text-gray-600">Lunch IN:</span>
          <span className="ml-2 font-mono">{record.time_in_pm || '—'}</span>
        </div>
        <div>
          <span className="text-gray-600">Afternoon OUT:</span>
          <span className="ml-2 font-mono">{record.time_out_pm || '—'}</span>
        </div>
      </div>

      {/* Issues */}
      {record.validation.issues.errors?.length > 0 && (
        <div className="mb-3 p-2 bg-red-50 rounded text-sm">
          <p className="font-medium text-red-800 mb-1">Issues:</p>
          <ul className="list-disc list-inside text-red-700 space-y-1">
            {record.validation.issues.errors.map((error, idx) => (
              <li key={idx}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(record)}
          className="flex-1 px-3 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
        >
          Edit
        </button>
        <button
          onClick={() => onApprove(record)}
          disabled={!record.validation.is_valid}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
```

---

## PHASE 5: TESTING

### Unit Tests

```php
// tests/Unit/TimeSlotConfigurationTest.php
class TimeSlotConfigurationTest extends TestCase
{
    public function test_calculates_lunch_boundary_correctly()
    {
        $schedule = WorkSchedule::factory()->create([
            'break_start_time' => '12:00:00',
            'break_end_time' => '13:00:00',
        ]);

        $config = new TimeSlotConfiguration($schedule);
        $boundary = $config->getLunchBoundaryMinutes();

        // Should be 12:30 (midpoint)
        $this->assertEquals(750, $boundary);
    }

    public function test_respects_grace_period()
    {
        $schedule = WorkSchedule::factory()->create([
            'grace_period_minutes' => 10,
        ]);

        $config = new TimeSlotConfiguration($schedule);
        $this->assertEquals(10, $config->getGracePeriodMinutes());
    }
}

// tests/Unit/TimeSlotAssignerTest.php
class TimeSlotAssignerTest extends TestCase
{
    public function test_assigns_logs_to_correct_slots()
    {
        $schedule = WorkSchedule::factory()->create();
        $config = new TimeSlotConfiguration($schedule);

        $logs = collect([
            (object)['log_datetime' => Carbon::parse('2026-03-20 08:00:00'), 'log_type' => 'IN'],
            (object)['log_datetime' => Carbon::parse('2026-03-20 12:00:00'), 'log_type' => 'OUT'],
            (object)['log_datetime' => Carbon::parse('2026-03-20 13:00:00'), 'log_type' => 'IN'],
            (object)['log_datetime' => Carbon::parse('2026-03-20 17:00:00'), 'log_type' => 'OUT'],
        ]);

        $assigner = new TimeSlotAssigner($config, $logs, Carbon::parse('2026-03-20'));
        $result = $assigner->assign();

        $this->assertEquals('08:00:00', $result['slots']['morning_in']);
        $this->assertEquals('12:00:00', $result['slots']['lunch_out']);
        $this->assertEquals('13:00:00', $result['slots']['lunch_in']);
        $this->assertEquals('17:00:00', $result['slots']['afternoon_out']);
    }
}

// tests/Unit/AttendanceValidatorTest.php
class AttendanceValidatorTest extends TestCase
{
    public function test_detects_invalid_time_sequence()
    {
        $schedule = WorkSchedule::factory()->create();

        $slots = [
            'morning_in' => '12:00:00',
            'lunch_out' => '08:00:00', // Invalid: after morning_in
            'lunch_in' => '13:00:00',
            'afternoon_out' => '17:00:00',
        ];

        $validator = new AttendanceValidator($schedule, $slots);
        $result = $validator->validate();

        $this->assertFalse($result['is_valid']);
        $this->assertNotEmpty($result['issues']['errors']);
    }
}
```

---

## PHASE 6: MIGRATION CHECKLIST

- [ ] Create TimeSlotConfiguration class
- [ ] Create TimeSlotAssigner class
- [ ] Create AttendanceValidator class
- [ ] Refactor AttendanceService to use new classes
- [ ] Create database migrations
- [ ] Create API endpoints
- [ ] Create frontend components
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Test with real data
- [ ] Deploy to production

---

## PHASE 7: ROLLBACK PLAN

If issues arise:

1. Keep old AttendanceService as `AttendanceServiceLegacy`
2. Add feature flag to switch between old and new
3. Monitor validation logs for issues
4. Gradual rollout: test with one department first
5. Full rollout after validation

