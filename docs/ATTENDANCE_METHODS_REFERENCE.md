# Attendance System - Methods Reference Guide

## Table of Contents
1. [File Locations](#file-locations)
2. [Main Service Methods](#main-service-methods)
3. [Processing Methods](#processing-methods)
4. [Calculation Methods](#calculation-methods)
5. [Helper Methods](#helper-methods)
6. [Controller Methods](#controller-methods)
7. [Model Methods](#model-methods)

---

## File Locations

### Core Files

```
app/
├── Services/
│   └── AttendanceService.php          ← MAIN PROCESSING LOGIC (all methods here)
├── Http/
│   └── Controllers/
│       ├── AttendanceController.php   ← HTTP routes and responses
│       └── ScheduleOverrideController.php
├── Models/
│   ├── AttendanceLog.php              ← Raw biometric logs
│   ├── AttendanceRecord.php           ← Processed attendance
│   ├── Employee.php
│   ├── WorkSchedule.php
│   └── ScheduleOverride.php
└── Console/
    └── Commands/
        ├── ProcessAttendanceLogs.php
        └── ReprocessAttendance.php
```

---

## Main Service Methods

**Location:** `app/Services/AttendanceService.php`

### 1. processCsvFile()
**Purpose:** Upload and parse CSV file from biometric device

**Parameters:**
- `$filePath` (string) - Path to uploaded CSV file
- `$originalFileName` (string) - Original filename

**Returns:** Array with success/error counts

**Usage:**
```php
$attendanceService->processCsvFile('/tmp/attendance.csv', 'attendance.csv');
```

**What it does:**
1. Opens CSV file
2. Parses each row
3. Stores in `attendance_logs` table
4. Returns statistics

---

### 2. processLogsToRecords()
**Purpose:** Process raw logs into attendance records for a date range

**Parameters:**
- `$startDate` (Carbon) - Start date
- `$endDate` (Carbon) - End date

**Returns:** Array with processed/error counts

**Usage:**
```php
$attendanceService->processLogsToRecords(
    Carbon::parse('2026-02-01'),
    Carbon::parse('2026-02-15')
);
```

**What it does:**
1. Loops through each date in range
2. Calls `processDateLogs()` for each date
3. Returns statistics

---

### 3. processDateLogs()
**Purpose:** Process logs for a specific date

**Parameters:**
- `$date` (Carbon) - Date to process

**Returns:** void

**What it does:**
1. Gets all logs for the date
2. Groups by employee
3. Gets all active employees
4. Calls `processEmployeeLogs()` for each employee

---

### 4. processEmployeeLogs()
**Purpose:** Process logs for a specific employee on a specific date (MAIN LOGIC)

**Parameters:**
- `$employeeCode` (string) - Employee code
- `$date` (Carbon) - Date
- `$logs` (Collection) - Employee's logs for the date

**Returns:** void

**What it does:**
1. Get employee, schedule, holiday, override
2. Remove duplicates
3. Infer log types (ignore button pressed)
4. Assign to time slots
5. Calculate late, overtime, undertime
6. Determine status
7. Save attendance record

**This is the CORE method where all processing happens!**

---

## Processing Methods

**Location:** `app/Services/AttendanceService.php`

### 5. removeExactDuplicates()
**Purpose:** Remove logs with same timestamp and type

**Parameters:**
- `$logs` (Collection) - Logs to filter

**Returns:** Collection (filtered logs)

**Example:**
```
Input:  08:00 IN, 08:00 IN, 12:00 OUT
Output: 08:00 IN, 12:00 OUT
```

---

### 6. inferLogTypesFromTime()
**Purpose:** Infer correct IN/OUT type based on time (IGNORE log_type field)

**Parameters:**
- `$logs` (Collection) - Logs to process
- `$date` (Carbon) - Date

**Returns:** Array of logs with inferred types

**What it does:**
1. Remove double-taps (< 2 minutes apart)
2. Infer type based on time and position
3. Apply lunch boundary rule (12:45 PM)

**Example:**
```
Input:  08:00 OUT (wrong), 12:00 IN (wrong)
Output: 08:00 IN (corrected), 12:00 OUT (corrected)
```

---

### 7. assignLogsToTimeSlotsFromInferred()
**Purpose:** Assign inferred logs to 4 time slots

**Parameters:**
- `$logs` (array) - Inferred logs
- `$date` (Carbon) - Date

**Returns:** Array with 4 time slots

**What it does:**
1. Morning IN: First IN before 12:00 PM
2. Lunch OUT: First OUT before 12:45 PM
3. Lunch IN: First IN at/after 12:45 PM
4. Afternoon OUT: Last OUT after 12:45 PM

**Example:**
```
Input:  08:00 IN, 12:00 OUT, 13:00 IN, 17:00 OUT
Output: {
    morning_in: '08:00:00',
    lunch_out: '12:00:00',
    lunch_in: '13:00:00',
    afternoon_out: '17:00:00'
}
```

---

### 8. pairInOutLogs()
**Purpose:** Create IN-OUT pairs for duration calculation

**Parameters:**
- `$logs` (array) - Inferred logs

**Returns:** Array of pairs with durations

**What it does:**
1. Match each IN with next OUT
2. Calculate duration in minutes
3. Ignore unpaired logs

**Example:**
```
Input:  08:00 IN, 12:00 OUT, 13:00 IN, 17:00 OUT
Output: [
    {in: 08:00, out: 12:00, duration: 240},
    {in: 13:00, out: 17:00, duration: 240}
]
```

---

## Calculation Methods

**Location:** `app/Services/AttendanceService.php`

### 9. isLate()
**Purpose:** Check if employee is late (morning)

**Parameters:**
- `$firstIn` (string|null) - Morning IN time
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** bool

**Logic:**
```
Schedule Start: 08:00
Grace Period: 15 minutes
Grace End: 08:15

08:00 → NOT late
08:10 → NOT late (within grace)
08:20 → LATE
```

---

### 10. calculateLateMinutes()
**Purpose:** Calculate late minutes (morning)

**Parameters:**
- `$firstIn` (string|null) - Morning IN time
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** int (minutes)

**Logic:**
```
Schedule Start: 08:00
Grace End: 08:15
Actual IN: 08:30

Late Minutes: 30 (from 08:00, not from 08:15)
```

---

### 11. isLatePM()
**Purpose:** Check if employee is late returning from lunch

**Parameters:**
- `$pmIn` (string|null) - Lunch IN time
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** bool

**Logic:**
```
Break End: 13:00
Late Threshold: 13:01

13:00 → NOT late
13:01 → NOT late
13:02 → LATE
```

---

### 12. calculateLatePM()
**Purpose:** Calculate afternoon late minutes

**Parameters:**
- `$pmIn` (string|null) - Lunch IN time
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** int (minutes)

---

### 13. isUndertime()
**Purpose:** Check if employee has undertime

**Parameters:**
- `$lastOut` (string|null) - Afternoon OUT time
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** bool

**Logic:**
```
Schedule End: 17:00
Allowance: 5 minutes
Allowed Early Out: 16:55

16:57 → NOT undertime (within allowance)
16:50 → UNDERTIME
```

---

### 14. calculateUndertimeMinutes()
**Purpose:** Calculate undertime minutes

**Parameters:**
- `$lastOut` (string|null) - Afternoon OUT time
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** int (minutes)

**Logic:**
```
Schedule End: 17:00
Actual OUT: 16:30

Undertime: 30 minutes
```

---

### 15. calculateOvertimeMinutes()
**Purpose:** Calculate overtime minutes

**Parameters:**
- `$lastOut` (string|null) - Afternoon OUT time
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** int (minutes)

**Logic:**
```
Schedule End: 17:00
Overtime Threshold: 18:00 (1 hour after)
Actual OUT: 18:30

Overtime: 90 minutes (from 17:00, includes threshold)
```

**Note:** Must work at least 1 hour after end time to qualify

---

### 16. countMissedLogs()
**Purpose:** Count how many time slots are missing

**Parameters:**
- `$timeSlots` (array) - Time slots
- `$pairs` (array) - IN-OUT pairs
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** int (0-4)

**Logic:**
```
Expected: 4 logs (morning IN, lunch OUT, lunch IN, afternoon OUT)
Actual: 2 logs (morning IN, afternoon OUT)
Missed: 2 logs
```

---

### 17. calculateWorkdayRendered()
**Purpose:** Calculate workday rendered (1.0, 0.5, or 0.0)

**Parameters:**
- `$status` (string) - Attendance status
- `$totalWorkedHours` (float) - Total hours worked
- `$schedule` (WorkSchedule) - Work schedule

**Returns:** float

**Logic:**
```
Absent → 0.0
Half Day → 0.5
Present/Late/Missed Log → 1.0
```

---

## Helper Methods

**Location:** `app/Services/AttendanceService.php`

### 18. determineAttendanceStatus()
**Purpose:** Determine attendance status (can be multiple)

**Parameters:**
- `$pairs` (array) - IN-OUT pairs
- `$firstIn` (string|null) - Morning IN
- `$lastOut` (string|null) - Afternoon OUT
- `$totalWorkedHours` (float) - Total hours
- `$schedule` (WorkSchedule) - Schedule
- `$hasMissingLogs` (bool) - Has missing logs
- `$isLateAM` (bool) - Late in morning
- `$isLatePM` (bool) - Late in afternoon
- `$isWorkingDay` (bool) - Is working day
- `$holiday` (Holiday|null) - Holiday
- `$override` (ScheduleOverride|null) - Override
- `$timeSlots` (array) - Time slots

**Returns:** string

**Examples:**
```
"Present"
"Late"
"Missed Log, Late"
"Half Day"
"Absent"
"Present - Sunday Work"
"Present - Unauthorized Work Day"
```

---

### 19. generateRemarks()
**Purpose:** Generate remarks for attendance record

**Parameters:**
- `$status` (string) - Status
- `$hasDuplicates` (bool) - Has duplicates
- `$hasIncompleteLogs` (bool) - Has incomplete logs
- `$lunchDeducted` (bool) - Lunch deducted
- `$pairCount` (int) - Number of pairs
- `$holiday` (Holiday|null) - Holiday
- `$override` (ScheduleOverride|null) - Override

**Returns:** string|null

**Examples:**
```
"Duplicate logs detected"
"Lunch break auto-deducted (missing lunch logs)"
"Sunday Work: Inventory day"
```

---

### 20. getOverrideForEmployee()
**Purpose:** Get schedule override for specific employee

**Parameters:**
- `$employee` (Employee) - Employee
- `$date` (Carbon) - Date

**Returns:** ScheduleOverride|null

**Priority:**
1. Employee-specific (many-to-many)
2. Employee-specific (single)
3. Department-wide

---

### 21. getScheduleForEmployee()
**Purpose:** Get work schedule for employee (with override support)

**Parameters:**
- `$employee` (Employee) - Employee
- `$date` (Carbon|null) - Date
- `$holiday` (Holiday|null) - Holiday
- `$override` (ScheduleOverride|null) - Override

**Returns:** WorkSchedule

**Priority:**
1. Override custom times (opening_time, closing_time)
2. Override schedule_id
3. Department schedule
4. Default schedule

---

### 22. isWorkingDay()
**Purpose:** Determine if date is a working day for employee

**Parameters:**
- `$date` (Carbon) - Date
- `$schedule` (WorkSchedule) - Schedule
- `$holiday` (Holiday|null) - Holiday
- `$override` (ScheduleOverride|null) - Override

**Returns:** bool

**Logic:**
```
Holiday → NOT working day
Saturday → Working day only if override exists
Sunday → Working day only if override exists
Monday-Friday → Working day (default)
```

---

### 23. createAbsentRecord()
**Purpose:** Create attendance record for absent employee

**Parameters:**
- `$employee` (Employee) - Employee
- `$date` (Carbon) - Date
- `$schedule` (WorkSchedule) - Schedule
- `$holiday` (Holiday|null) - Holiday
- `$override` (ScheduleOverride|null) - Override
- `$isWorkingDay` (bool) - Is working day

**Returns:** void

---

### 24. parseCsvRow()
**Purpose:** Parse a single CSV row from biometric device

**Parameters:**
- `$row` (array) - CSV row

**Returns:** array|null

**CSV Format:**
```
Employee ID, Department, Name, Time, Date, Activity, Image, Address
```

---

## Query Methods

**Location:** `app/Services/AttendanceService.php`

### 25. getAttendanceLogs()
**Purpose:** Get attendance logs with filters

**Parameters:**
- `$filters` (array) - Filters (start_date, end_date, employee_code, per_page)

**Returns:** Paginated collection

---

### 26. getAttendanceRecords()
**Purpose:** Get attendance records with filters

**Parameters:**
- `$filters` (array) - Filters (start_date, end_date, employee_id, missed_logs_count, per_page)

**Returns:** Paginated collection

---

### 27. getUploadedLogsDateRange()
**Purpose:** Get date range from uploaded logs

**Returns:** Array with start and end dates

---

### 28. getAttendanceRecordsDateRange()
**Purpose:** Get date range from attendance records

**Returns:** Array with start, end, total_days, formatted dates

---

### 29. getAttendanceSummary()
**Purpose:** Get attendance summary grouped by employee

**Returns:** Array of employee summaries with:
- Total workdays
- Total absences
- Total late minutes
- Total undertime minutes
- Total overtime minutes
- Total missed logs
- Late frequency
- Daily records

---

## Controller Methods

**Location:** `app/Http/Controllers/AttendanceController.php`

### 30. storeUpload()
**Purpose:** Handle CSV file upload

**Route:** `POST /admin/attendance/store-upload`

**What it does:**
1. Validate file
2. Store temporarily
3. Call `processCsvFile()`
4. Auto-process logs
5. Return to records page

---

### 31. processLogs()
**Purpose:** Manually process logs for date range

**Route:** `POST /admin/attendance/process-logs`

**Parameters:**
- start_date
- end_date

---

### 32. records()
**Purpose:** Display attendance records page

**Route:** `GET /admin/attendance/records`

**Returns:** Inertia page with summary and date range

---

### 33. logs()
**Purpose:** Display raw logs page

**Route:** `GET /admin/attendance/logs`

**Returns:** Inertia page with filtered logs

---

## Schedule Override Controller Methods

**Location:** `app/Http/Controllers/ScheduleOverrideController.php`

### 34. store()
**Purpose:** Create schedule override

**What it does:**
1. Validate data
2. Create override
3. Attach employees (if employee-specific)
4. **Auto-reprocess attendance** for that date

---

### 35. update()
**Purpose:** Update schedule override

**What it does:**
1. Validate data
2. Update override
3. Sync employees
4. **Auto-reprocess attendance** for old and new dates

---

### 36. destroy()
**Purpose:** Delete schedule override

**What it does:**
1. Delete override
2. **Auto-reprocess attendance** for that date

---

### 37. reprocessAttendanceForDate()
**Purpose:** Automatically reprocess attendance when override changes

**Parameters:**
- `$date` (string) - Date to reprocess

**What it does:**
1. Delete existing records for date
2. Call `processLogsToRecords()`
3. Log the action

---

## Model Methods

### AttendanceRecord Model
**Location:** `app/Models/AttendanceRecord.php`

- Relationships: `employee()`, `schedule()`
- Casts: `attendance_date` to date
- Fillable fields

### AttendanceLog Model
**Location:** `app/Models/AttendanceLog.php`

- Relationships: `employee()`
- Casts: `log_datetime` to datetime
- Fillable fields

---

## Method Call Flow

### When CSV is Uploaded

```
1. AttendanceController::storeUpload()
   ↓
2. AttendanceService::processCsvFile()
   ↓
3. AttendanceService::processLogsToRecords()
   ↓
4. AttendanceService::processDateLogs()
   ↓
5. AttendanceService::processEmployeeLogs()
   ↓
6. AttendanceService::removeExactDuplicates()
   ↓
7. AttendanceService::inferLogTypesFromTime()
   ↓
8. AttendanceService::assignLogsToTimeSlotsFromInferred()
   ↓
9. AttendanceService::pairInOutLogs()
   ↓
10. AttendanceService::calculateLateMinutes()
11. AttendanceService::calculateLatePM()
12. AttendanceService::calculateOvertimeMinutes()
13. AttendanceService::calculateUndertimeMinutes()
14. AttendanceService::countMissedLogs()
    ↓
15. AttendanceService::determineAttendanceStatus()
    ↓
16. AttendanceService::calculateWorkdayRendered()
    ↓
17. AttendanceService::generateRemarks()
    ↓
18. AttendanceRecord::updateOrCreate() (save to database)
```

---

## Quick Reference

### Most Important Methods

1. **processEmployeeLogs()** - Main processing logic
2. **inferLogTypesFromTime()** - Corrects misclicks
3. **assignLogsToTimeSlotsFromInferred()** - Assigns to 4 slots
4. **determineAttendanceStatus()** - Determines status
5. **getScheduleForEmployee()** - Gets schedule with override support

### Calculation Methods

- `calculateLateMinutes()` - Morning late
- `calculateLatePM()` - Afternoon late
- `calculateUndertimeMinutes()` - Undertime
- `calculateOvertimeMinutes()` - Overtime
- `countMissedLogs()` - Missed logs count

### Helper Methods

- `getOverrideForEmployee()` - Get employee override
- `isWorkingDay()` - Check if working day
- `generateRemarks()` - Generate remarks

---

## How to Find Methods

### In Your IDE

1. **Open file:** `app/Services/AttendanceService.php`
2. **View outline:** Most IDEs show method list in sidebar
3. **Search:** Use Ctrl+F to find method name

### In VS Code

1. Open `app/Services/AttendanceService.php`
2. Press `Ctrl+Shift+O` to see method outline
3. Type method name to jump to it

### Using Command Line

```bash
# Find all methods in AttendanceService
grep -n "private function\|public function" app/Services/AttendanceService.php

# Find specific method
grep -n "function processEmployeeLogs" app/Services/AttendanceService.php
```

---

**Last Updated:** February 25, 2026  
**Total Methods:** 37+ methods across all files  
**Main File:** `app/Services/AttendanceService.php` (contains 29 methods)

