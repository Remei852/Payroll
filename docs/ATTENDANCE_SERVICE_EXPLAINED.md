# AttendanceService.php - Complete Explanation

## File Location
`C:\OJT\Attendance Checker\Checker\app\Services\AttendanceService.php`

---

## What This File Does

This is the **CORE** of the attendance system. It contains all the logic for:
1. Processing biometric logs from CSV files
2. Converting raw logs into attendance records
3. Calculating late, overtime, and undertime
4. Determining attendance status
5. Handling misclicked logs
6. Managing schedule overrides

Think of it as the "brain" of the attendance system.

---

## File Structure Overview

```php
class AttendanceService
{
    // CONSTANTS (Configuration)
    private const GRACE_PERIOD_MINUTES = 15;
    private const EARLY_OUT_ALLOWANCE_MINUTES = 5;
    private const LUNCH_BREAK_START = '12:00:00';
    private const LUNCH_BREAK_END = '13:00:00';
    
    // PUBLIC METHODS (Called from controllers)
    public function processCsvFile()
    public function processLogsToRecords()
    public function getAttendanceLogs()
    public function getAttendanceRecords()
    public function getAttendanceSummary()
    
    // PRIVATE METHODS (Internal processing)
    private function processDateLogs()
    private function processEmployeeLogs()
    private function inferLogTypesFromTime()
    private function assignLogsToTimeSlotsFromInferred()
    // ... and many more
}
```

---

## Part 1: Constants (Configuration)

```php
private const GRACE_PERIOD_MINUTES = 15;
private const EARLY_OUT_ALLOWANCE_MINUTES = 5;
private const LUNCH_BREAK_START = '12:00:00';
private const LUNCH_BREAK_END = '13:00:00';
```

### What These Mean:

**GRACE_PERIOD_MINUTES = 15**
- Employees can arrive up to 15 minutes late without being marked "late"
- Example: Schedule starts at 8:00 AM, grace period ends at 8:15 AM
- Arrive at 8:10 AM → Not late
- Arrive at 8:20 AM → Late

**EARLY_OUT_ALLOWANCE_MINUTES = 5**
- Employees can leave up to 5 minutes early without undertime
- Example: Schedule ends at 5:00 PM, allowed early out at 4:55 PM
- Leave at 4:57 PM → No undertime
- Leave at 4:50 PM → Undertime

**LUNCH_BREAK_START/END**
- Standard lunch break times
- Used for automatic lunch deduction when logs are missing

---

## Part 2: CSV Upload Processing

### Method: `processCsvFile($filePath, $originalFileName)`

**What it does:**
Reads a CSV file from the biometric device and stores each log in the database.

**Step by step:**
```php
1. Open CSV file
2. Skip header row
3. For each row:
   a. Parse employee code, time, date, activity
   b. Convert to proper format
   c. Store in attendance_logs table
4. Return statistics (success, errors, skipped)
```

**CSV Format Expected:**
```
Employee ID, Department, Name, Time, Date, Activity, Image, Address
SHOP2025-22, Shop, John Doe, 08:05:23, 02/03/2026, IN, image.jpg, Main Office
```

**What gets stored:**
```php
AttendanceLog::create([
    'employee_code' => 'SHOP2025-22',
    'log_datetime' => '2026-02-03 08:05:23',
    'log_type' => 'IN',
    'location' => 'Main Office',
    'source_file' => 'attendance.csv'
]);
```

---

## Part 3: Main Processing Flow

### Method: `processLogsToRecords($startDate, $endDate)`

**What it does:**
Converts raw logs into attendance records for a date range.

**Flow:**
```
processLogsToRecords()
    ↓
    Loop through each date
    ↓
processDateLogs($date)
    ↓
    Get all logs for date
    Group by employee
    ↓
processEmployeeLogs($employeeCode, $date, $logs)
    ↓
    MAIN PROCESSING HAPPENS HERE!
```

---

## Part 4: The Core - processEmployeeLogs()

This is the **MOST IMPORTANT** method. Let me break it down step by step:

### Step 1: Get Employee Information

```php
$employee = Employee::with('department.workSchedule')
    ->where('employee_code', $employeeCode)
    ->first();
```

**What this does:**
- Finds the employee by their code
- Loads their department
- Loads their work schedule

### Step 2: Check for Special Circumstances

```php
$holiday = Holiday::whereDate('holiday_date', $date)->first();
$override = $this->getOverrideForEmployee($employee, $date);
$schedule = $this->getScheduleForEmployee($employee, $date, $holiday, $override);
$isWorkingDay = $this->isWorkingDay($date, $schedule, $holiday, $override);
```

**What this does:**
- Checks if date is a holiday
- Checks if there's a schedule override (Sunday work, special hours, etc.)
- Gets the correct schedule (regular or override)
- Determines if it's a working day

### Step 3: Handle No Logs (Absent)

```php
if ($logs->isEmpty()) {
    if ($shouldCreateRecord) {
        $this->createAbsentRecord($employee, $date, $schedule, $holiday, $override, $isWorkingDay);
    }
    return;
}
```

**What this does:**
- If employee has no logs for the day
- And it's a working day (or has override)
- Create an "Absent" record

### Step 4: Clean Up Logs

```php
// Sort by time
$sortedLogs = $logs->sortBy('log_datetime')->values();

// Remove exact duplicates
$uniqueLogs = $this->removeExactDuplicates($sortedLogs);

// Infer correct types (IGNORE what button was pressed!)
$inferredLogs = $this->inferLogTypesFromTime($uniqueLogs, $date);
```

**What this does:**
1. **Sort logs** by time (earliest to latest)
2. **Remove duplicates** (same time, same type)
3. **Infer correct IN/OUT** based on time, NOT button pressed

**Example:**
```
Raw logs (what employee pressed):
08:00 OUT ← Wrong!
12:00 IN  ← Wrong!
13:00 OUT ← Wrong!
17:00 IN  ← Wrong!

After inference (corrected):
08:00 IN  ← Corrected!
12:00 OUT ← Corrected!
13:00 IN  ← Corrected!
17:00 OUT ← Corrected!
```

### Step 5: Assign to Time Slots

```php
$timeSlots = $this->assignLogsToTimeSlotsFromInferred($inferredLogs, $date);
```

**What this does:**
Assigns logs to 4 specific time slots:

```php
[
    'morning_in' => '08:00:00',      // First IN before 12:00 PM
    'lunch_out' => '12:00:00',       // First OUT before 12:45 PM
    'lunch_in' => '13:00:00',        // First IN at/after 12:45 PM
    'afternoon_out' => '17:00:00'    // Last OUT after 12:45 PM
]
```

### Step 6: Calculate Worked Hours

```php
$pairs = $this->pairInOutLogs($inferredLogs);
$totalWorkedMinutes = array_sum(array_column($pairs, 'duration_minutes'));
```

**What this does:**
1. **Pair IN-OUT logs** (IN → OUT, IN → OUT)
2. **Calculate duration** for each pair
3. **Sum all durations** to get total worked minutes

**Example:**
```
Pairs:
08:00 IN → 12:00 OUT = 240 minutes (4 hours)
13:00 IN → 17:00 OUT = 240 minutes (4 hours)

Total: 480 minutes (8 hours)
```

### Step 7: Handle Lunch Deduction

```php
if (count($pairs) === 1) {
    // Single pair crossing lunch hours
    if ($pairStart->lt($lunchStart) && $pairEnd->gt($lunchEnd)) {
        $totalWorkedMinutes -= 60; // Deduct 1 hour lunch
        $lunchDeducted = true;
    }
}
```

**What this does:**
- If employee only has 1 pair (missed lunch logs)
- And the pair crosses lunch hours (e.g., 8 AM to 5 PM)
- Automatically deduct 1 hour for lunch

### Step 8: Calculate Late, Overtime, Undertime

```php
$lateMinutesAM = $this->calculateLateMinutes($firstIn, $schedule);
$lateMinutesPM = $this->calculateLatePM($timeSlots['lunch_in'], $schedule);
$totalLateMinutes = $lateMinutesAM + $lateMinutesPM;

$overtimeMinutes = $this->calculateOvertimeMinutes($lastOut, $schedule);
$undertimeMinutes = $this->calculateUndertimeMinutes($lastOut, $schedule);
```

**What this does:**
- **Late AM:** Compare morning IN against schedule start (with 15 min grace)
- **Late PM:** Compare lunch IN against break end (with 1 min grace)
- **Overtime:** Calculate if worked 1+ hour after schedule end
- **Undertime:** Calculate if left before schedule end (with 5 min allowance)

### Step 9: Count Missed Logs

```php
$missedLogsCount = $this->countMissedLogs($timeSlots, $pairs, $schedule);
```

**What this does:**
Counts how many of the 4 expected logs are missing:
- Morning IN
- Lunch OUT
- Lunch IN
- Afternoon OUT

**Example:**
```
Expected: 4 logs
Actual: 2 logs (morning IN, afternoon OUT)
Missed: 2 logs
```

### Step 10: Determine Status

```php
$status = $this->determineAttendanceStatus(
    $pairs, $firstIn, $lastOut, $totalWorkedHours,
    $schedule, $missedLogsCount > 0, $isLateAM, $isLatePM,
    $isWorkingDay, $holiday, $override, $timeSlots
);
```

**What this does:**
Determines the attendance status based on all factors:

**Possible statuses:**
- "Present" - Normal attendance
- "Late" - Arrived late
- "Missed Log" - Missing some logs
- "Half Day" - Only morning or afternoon
- "Absent" - No logs or no valid IN
- "Undertime" - Left early
- "Present - Sunday Work" - Authorized Sunday work
- "Present - Unauthorized Work Day" - Worked without authorization
- "Missed Log, Late" - Multiple issues (combined)

### Step 11: Calculate Workday Rendered

```php
$workdayRendered = $this->calculateWorkdayRendered($status, $totalWorkedHours, $schedule);
```

**What this does:**
Calculates how much of a workday was rendered:
- **1.0** = Full day (Present, Late, Missed Log, etc.)
- **0.5** = Half day
- **0.0** = Absent

### Step 12: Generate Remarks

```php
$remarks = $this->generateRemarks($status, $hasDuplicates, $hasIncompleteLogs, 
                                  $lunchDeducted, count($pairs), $holiday, $override);
```

**What this does:**
Generates helpful remarks like:
- "Duplicate logs detected"
- "Lunch break auto-deducted (missing lunch logs)"
- "Sunday Work: Inventory day"
- "Holiday: New Year's Day (regular_holiday)"

### Step 13: Save to Database

```php
AttendanceRecord::updateOrCreate(
    [
        'employee_id' => $employee->id,
        'attendance_date' => $date->format('Y-m-d'),
    ],
    [
        'schedule_id' => $schedule->id,
        'time_in_am' => $timeSlots['morning_in'],
        'time_out_lunch' => $timeSlots['lunch_out'],
        'time_in_pm' => $timeSlots['lunch_in'],
        'time_out_pm' => $timeSlots['afternoon_out'],
        'late_minutes_am' => $isWorkingDay ? $lateMinutesAM : 0,
        'late_minutes_pm' => $isWorkingDay ? $lateMinutesPM : 0,
        'total_late_minutes' => $isWorkingDay ? $totalLateMinutes : 0,
        'overtime_minutes' => $overtimeMinutes,
        'undertime_minutes' => $isWorkingDay ? $undertimeMinutes : 0,
        'workday_rendered' => $workdayRendered,
        'missed_logs_count' => $isWorkingDay ? $missedLogsCount : 0,
        'status' => $status,
        'remarks' => $remarks,
    ]
);
```

**What this does:**
Saves (or updates) the attendance record in the database with all calculated values.

---

## Part 5: Key Helper Methods

### inferLogTypesFromTime()

**Purpose:** Correct misclicked logs

**How it works:**
```php
// IGNORE the log_type field!
// Infer based on:
// 1. Time of day
// 2. Position in sequence
// 3. Lunch boundary (12:45 PM)

if ($index === 0) {
    $inferredType = 'IN'; // First log is always IN
}
elseif ($index === 1) {
    if ($time < 12:45 PM) {
        $inferredType = 'OUT'; // Lunch OUT
    } else {
        $inferredType = 'IN'; // Lunch IN (skipped lunch OUT)
    }
}
// ... and so on
```

### assignLogsToTimeSlotsFromInferred()

**Purpose:** Assign logs to 4 time slots

**Rules:**
```php
Morning IN:
- Time range: 6:00 AM - 11:59 AM
- Type: IN
- Priority: First IN in this range

Lunch OUT:
- Time range: 11:00 AM - 12:44 PM
- Type: OUT
- Priority: First OUT before 12:45 PM

Lunch IN:
- Time range: 12:45 PM onwards
- Type: IN
- Priority: First IN at/after 12:45 PM

Afternoon OUT:
- Time range: 12:45 PM onwards
- Type: OUT
- Priority: LAST OUT after 12:45 PM
```

### getOverrideForEmployee()

**Purpose:** Get schedule override for employee

**Priority:**
```php
1. Employee-specific override (many-to-many)
   ↓
2. Employee-specific override (single)
   ↓
3. Department-wide override
   ↓
4. No override
```

**Why this matters:**
- If HR creates Sunday work override for 1 employee
- Only that employee should be affected
- Not the entire department

### getScheduleForEmployee()

**Purpose:** Get work schedule with override support

**Priority:**
```php
1. Override custom times (opening_time, closing_time)
   ↓
2. Override schedule_id
   ↓
3. Department schedule
   ↓
4. Default schedule
```

**Why this matters:**
- If override has custom hours (10 AM - 6 PM)
- Use those hours for late/overtime calculation
- Not the regular schedule (8 AM - 5 PM)

---

## Part 6: Query Methods

### getAttendanceSummary()

**Purpose:** Get summary of attendance for all employees

**What it returns:**
```php
[
    [
        'employee_id' => 1,
        'employee_code' => 'SHOP2025-22',
        'employee_name' => 'Doe, John',
        'department' => 'Shop',
        'total_workdays' => 20.5,
        'total_absences' => 1.5,
        'total_late_minutes' => 120,
        'total_undertime_minutes' => 30,
        'total_overtime_minutes' => 180,
        'total_missed_logs' => 5,
        'late_frequency' => 8,
        'records' => [
            // Daily records array
        ]
    ],
    // ... more employees
]
```

**Used by:** Attendance Records page to display summary table

---

## Complete Flow Example

Let's trace a complete example:

### Input: CSV File
```csv
Employee ID, Department, Name, Time, Date, Activity, Image, Address
SHOP2025-22, Shop, John Doe, 08:05:23, 02/03/2026, OUT, img.jpg, Main Office
SHOP2025-22, Shop, John Doe, 12:02:45, 02/03/2026, IN, img.jpg, Main Office
SHOP2025-22, Shop, John Doe, 13:05:29, 02/03/2026, OUT, img.jpg, Main Office
SHOP2025-22, Shop, John Doe, 17:37:41, 02/03/2026, IN, img.jpg, Main Office
```

### Step 1: Upload (processCsvFile)
```
Stores 4 logs in attendance_logs table
```

### Step 2: Process (processLogsToRecords)
```
Calls processEmployeeLogs for SHOP2025-22 on 2026-02-03
```

### Step 3: Clean Logs
```
Remove duplicates: None
Remove double-taps: None
```

### Step 4: Infer Types (IGNORE button pressed!)
```
08:05:23 OUT → Corrected to IN (position 0, before noon)
12:02:45 IN  → Corrected to OUT (position 1, before 12:45)
13:05:29 OUT → Corrected to IN (position 2, after 12:45)
17:37:41 IN  → Corrected to OUT (position 3, after 12:45)
```

### Step 5: Assign to Time Slots
```
morning_in: 08:05:23
lunch_out: 12:02:45
lunch_in: 13:05:29
afternoon_out: 17:37:41
```

### Step 6: Calculate
```
Pairs:
- 08:05 → 12:02 = 237 minutes
- 13:05 → 17:37 = 272 minutes
Total: 509 minutes (8.48 hours)

Late AM: 5 minutes (08:05 vs 08:00 start, within grace)
Late PM: 5 minutes (13:05 vs 13:00 break end)
Total Late: 10 minutes

Overtime: 37 minutes (17:37 vs 17:00 end)
Undertime: 0 minutes
Missed Logs: 0
```

### Step 7: Determine Status
```
Status: "Late" (has late minutes)
Workday Rendered: 1.0 (full day)
```

### Step 8: Save to Database
```sql
INSERT INTO attendance_records (
    employee_id, attendance_date,
    time_in_am, time_out_lunch, time_in_pm, time_out_pm,
    late_minutes_am, late_minutes_pm, total_late_minutes,
    overtime_minutes, undertime_minutes,
    workday_rendered, missed_logs_count,
    status, remarks
) VALUES (
    1, '2026-02-03',
    '08:05:23', '12:02:45', '13:05:29', '17:37:41',
    5, 5, 10,
    37, 0,
    1.0, 0,
    'Late', NULL
);
```

---

## Summary

**AttendanceService.php is the brain of the attendance system that:**

1. ✅ Reads CSV files from biometric devices
2. ✅ Corrects misclicked logs automatically
3. ✅ Assigns logs to 4 time slots (morning IN, lunch OUT, lunch IN, afternoon OUT)
4. ✅ Calculates late, overtime, undertime
5. ✅ Handles schedule overrides (Sunday work, custom hours)
6. ✅ Determines attendance status
7. ✅ Saves processed records to database
8. ✅ Provides summary data for reports

**Key Features:**
- **Smart:** Ignores misclicks, infers correct log types
- **Flexible:** Handles overrides, holidays, special schedules
- **Accurate:** Uses time-slot approach, not simple pairing
- **Fair:** Grace periods, allowances, automatic lunch deduction
- **Complete:** Tracks everything (late, overtime, undertime, missed logs)

**Most Important Method:**
`processEmployeeLogs()` - This is where all the magic happens!

---

**File Size:** ~1,600 lines of code  
**Methods:** 29 methods  
**Purpose:** Core attendance processing logic  
**Status:** Production ready ✅

