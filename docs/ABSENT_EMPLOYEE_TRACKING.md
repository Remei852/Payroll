# Absent Employee Tracking Implementation

## Problem Identified

**Original Behavior:**
- System ONLY created attendance records for employees who had logs in the CSV
- Employees with NO logs (absent) were NOT tracked
- Absent employees did NOT appear in the attendance page
- No way to see who was absent on any given day

**Issues This Caused:**
1. ❌ Cannot track absences
2. ❌ Cannot calculate absence deductions for payroll
3. ❌ Cannot generate absence letters
4. ❌ Incomplete attendance data
5. ❌ No visibility of who didn't show up

## Solution Implemented

**New Behavior:**
- System now processes ALL active employees for each date
- Creates attendance records for EVERYONE, whether they have logs or not
- Absent employees (no logs) get a record with status "Absent"
- Complete attendance tracking for all employees

## How It Works

### Processing Flow

1. **Get Date to Process**: e.g., 2026-02-23
2. **Get All Logs for Date**: From attendance_logs table
3. **Get ALL Active Employees**: From employees table (not deleted)
4. **For Each Employee**:
   - Check if they have logs for this date
   - **If YES**: Process logs normally (calculate times, late, overtime, etc.)
   - **If NO**: Create absent record

### Absent Record Creation

When an employee has NO logs:
```php
createAbsentRecord() creates:
- time_in_am: null
- time_out_lunch: null
- time_in_pm: null
- time_out_pm: null
- late_minutes_am: 0
- late_minutes_pm: 0
- total_late_minutes: 0
- overtime_minutes: 0
- workday_rendered: 0
- missed_logs_count: 0
- status: Determined by holiday/override
- remarks: Includes holiday/override info if applicable
```

### Status Determination for Absent Employees

#### Regular Working Day
- **Status**: "Absent"
- **Deduction**: Yes (will be calculated in payroll)

#### Holiday (Paid)
- **Status**: "Absent - Holiday Pay"
- **Deduction**: No (they get paid anyway)

#### Holiday (Unpaid)
- **Status**: "Absent - Holiday"
- **Deduction**: No (not expected to work)

#### Override: No Work Expected (Typhoon, etc.)
- **Status**: "Absent - Excused"
- **Deduction**: No (excused absence)

#### Override: Sunday Work
- **Status**: "Absent"
- **Deduction**: Yes (they were scheduled to work)

## Database Storage

### attendance_records Table

**Employee with Logs:**
```
id: 1
employee_id: 5
attendance_date: 2026-02-23
time_in_am: 08:05:00
time_out_lunch: 12:00:00
time_in_pm: 13:00:00
time_out_pm: 17:00:00
late_minutes_am: 5
total_late_minutes: 5
status: Late
workday_rendered: 1.0
```

**Employee with NO Logs (Absent):**
```
id: 2
employee_id: 6
attendance_date: 2026-02-23
time_in_am: NULL
time_out_lunch: NULL
time_in_pm: NULL
time_out_pm: NULL
late_minutes_am: 0
total_late_minutes: 0
status: Absent
workday_rendered: 0
```

## Attendance Page Display

### Before (Old System)
```
Date: 2026-02-23
Employees Shown: 15 (only those with logs)
Missing: 5 absent employees (not visible)
```

### After (New System)
```
Date: 2026-02-23
Employees Shown: 20 (all employees)
- 15 with logs (Present, Late, etc.)
- 5 without logs (Absent)
```

## Benefits

### 1. Complete Attendance Tracking
- See ALL employees for any date
- Know exactly who was absent
- No missing data

### 2. Accurate Payroll
- Can calculate absence deductions
- Know total absences per employee
- Accurate workday count

### 3. Letter Generation
- Can generate absence letters
- Track absence patterns
- Identify chronic absenteeism

### 4. Better Reporting
- Total absences per day
- Absence rate per department
- Attendance trends

### 5. Fair Treatment
- Excused absences properly tracked
- Holiday absences don't penalize
- Typhoon days marked as excused

## Example Scenarios

### Scenario 1: Regular Weekday
**Date**: Monday, Feb 23, 2026
**Employees**: 20 total
**Logs**: 18 employees logged in

**Result**:
- 18 records with times and status (Present, Late, etc.)
- 2 records with status "Absent"
- All 20 employees visible in attendance page

### Scenario 2: Holiday
**Date**: Dec 25, 2026 (Christmas - Paid Holiday)
**Employees**: 20 total
**Logs**: 2 employees logged in (working on holiday)

**Result**:
- 2 records: "Present - Holiday" (will get holiday pay multiplier)
- 18 records: "Absent - Holiday Pay" (get regular pay, no deduction)
- All 20 employees visible

### Scenario 3: Typhoon Day
**Date**: Aug 15, 2026
**Override**: No Work Expected (Typhoon Signal #3)
**Employees**: 20 total
**Logs**: 1 employee logged in (heroic effort)

**Result**:
- 1 record: "Present - Special Circumstances" (special recognition)
- 19 records: "Absent - Excused" (no deduction)
- All 20 employees visible

### Scenario 4: Sunday Work
**Date**: Sunday, Feb 22, 2026
**Override**: Sunday Work for Shop department
**Employees**: 5 in Shop department
**Logs**: 4 employees logged in

**Result**:
- 4 records: "Present - Sunday Work" (Sunday rate)
- 1 record: "Absent" (deduction - they were scheduled)
- All 5 employees visible

## Performance Considerations

### Database Impact
- **Before**: ~15 records per day (only employees with logs)
- **After**: ~20 records per day (all employees)
- **Increase**: ~33% more records

### Processing Time
- **Before**: Process only employees with logs
- **After**: Process all employees
- **Impact**: Slightly slower, but negligible (milliseconds per employee)

### Benefits Outweigh Costs
- Complete data is worth the small performance cost
- Modern databases handle this easily
- Essential for accurate payroll and reporting

## Manual Correction Still Possible

Even with automatic absent tracking, you can still:
1. Manually correct any attendance record
2. Change status from "Absent" to "Present" if needed
3. Add times manually if employee forgot to log
4. Add correction reason for audit trail

## Code Changes

### Modified Methods

#### processDateLogs()
**Before:**
```php
foreach ($logs as $employeeCode => $employeeLogs) {
    $this->processEmployeeLogs($employeeCode, $date, $employeeLogs);
}
```

**After:**
```php
$allEmployees = Employee::whereNull('deleted_at')->get();
foreach ($allEmployees as $employee) {
    $employeeLogs = $logs->get($employee->employee_code, collect());
    $this->processEmployeeLogs($employee->employee_code, $date, $employeeLogs);
}
```

#### processEmployeeLogs()
**Added:**
```php
if ($logs->isEmpty()) {
    $this->createAbsentRecord($employee, $date, $schedule, $holiday, $override, $isWorkingDay);
    return;
}
```

#### createAbsentRecord() (New Method)
Creates attendance record for employees with no logs, with appropriate status based on holiday/override.

## Testing

### Test 1: Regular Day with Absences
1. Upload CSV with 15 employees
2. Verify 20 employees show in attendance page
3. Verify 5 employees have status "Absent"
4. Verify absent employees have all null times

### Test 2: Holiday with Absences
1. Add holiday (e.g., Christmas)
2. Upload CSV with 2 employees
3. Verify 20 employees show
4. Verify 18 employees have "Absent - Holiday Pay"

### Test 3: Typhoon Day
1. Add override: No Work Expected
2. Upload CSV with 1 employee
3. Verify 20 employees show
4. Verify 19 employees have "Absent - Excused"

### Test 4: Sunday Work
1. Add override: Sunday Work for department
2. Upload CSV with 4 out of 5 employees
3. Verify 5 employees show
4. Verify 1 employee has "Absent" (deduction)

## Files Modified
1. `app/Services/AttendanceService.php`
   - Updated processDateLogs() to process all employees
   - Updated processEmployeeLogs() to handle empty logs
   - Added createAbsentRecord() method

## Build Status
✅ No diagnostics errors
✅ All employees now tracked
✅ Absent employees visible in attendance page
✅ Complete attendance data

## Answer to Your Questions

### Q1: "Is it okay not to include visual indicators as long as I can edit in the attendance page?"
**A**: Yes, that's fine! Manual correction feature will allow you to fix any issues. Visual indicators are nice-to-have, not essential.

### Q2: "If during weekdays there are no logs since they are absent, can this be seen in the attendance page?"
**A**: YES, NOW! With this update, ALL employees appear in the attendance page, whether they have logs or not. Absent employees will show with status "Absent" and all time fields as null.

### Q3: "How is it stored in the database?"
**A**: Absent employees now get a record in the `attendance_records` table with:
- All time fields: NULL
- Status: "Absent" (or "Absent - Excused", "Absent - Holiday Pay", etc.)
- Late minutes: 0
- Workday rendered: 0
- This ensures complete tracking for payroll and reporting
