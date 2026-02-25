# Afternoon Late and Multiple Status Implementation

## Summary of Changes

### 1. Afternoon Late Calculation
**Rule**: Employee is late in the afternoon if time_in_pm is more than 1 minute after break_end_time

**Implementation**:
- Added `isLatePM()` method: Checks if PM in > break_end_time + 1 minute
- Added `calculateLatePM()` method: Calculates late minutes from break_end_time
- `late_minutes_pm` now properly calculated and stored
- `total_late_minutes` = `late_minutes_am` + `late_minutes_pm`

**Example**:
- Break ends: 13:00
- Time in PM: 13:02:42
- Late PM: 2 minutes (from 13:00)

### 2. Multiple Status Support
**Rule**: Status can show multiple conditions separated by commas, with "Missed Log" having highest priority

**Status Priority** (highest to lowest):
1. **Missed Log** - Any log is missing (morning in, lunch out, lunch in, afternoon out)
2. **Absent** - No valid IN log exists
3. **Half Day** - Total worked hours < threshold
4. **Late** - Late in AM or PM (beyond grace period for status)
5. **Undertime** - Left early
6. **Present** - No issues

**Examples**:
- "Missed Log, Absent" - No logs at all
- "Missed Log, Half Day, Late" - Missing afternoon out, worked < 4 hours, late
- "Late, Undertime" - Late arrival and early departure
- "Half Day, Late, Undertime" - Multiple issues
- "Absent, Late" - No morning in but has PM in (late)

### 3. Late Calculation Details

#### Morning Late (AM)
- **Threshold**: Scheduled work_start_time (no grace for payroll)
- **Status**: Uses 15-minute grace period to show "Late" status
- **Calculation**: From work_start_time

#### Afternoon Late (PM)
- **Threshold**: break_end_time + 1 minute
- **Calculation**: From break_end_time if > 1 minute late
- **Example**: Break ends 13:00, in at 13:03 = 3 minutes late

### 4. Frontend Updates

#### Status Badge Colors (by priority)
- **Red**: Missed Log, Incomplete Logs, Late & Undertime
- **Gray**: Absent
- **Orange**: Half Day, Undertime
- **Yellow**: Late (only)
- **Green**: Present

#### Status Display
- Shows full combined status text (e.g., "Missed Log, Half Day, Late")
- Badge color determined by highest priority status
- Supports any combination of statuses

## Testing Results

### Afternoon Late Examples
```json
{
  "time_in_pm": "13:02:42",
  "late_minutes_am": 4,
  "late_minutes_pm": 2,
  "total_late_minutes": 6,
  "status": "Late"
}
```

### Multiple Status Examples
```json
{
  "status": "Missed Log, Absent",
  "time_in_am": null,
  "time_out_pm": null
}

{
  "status": "Missed Log, Half Day, Late",
  "time_in_am": "08:40:55",
  "time_out_pm": null,
  "late_minutes_am": 10
}

{
  "status": "Late, Undertime",
  "late_minutes_am": 0,
  "late_minutes_pm": 3
}

{
  "status": "Half Day, Late, Undertime",
  "time_in_am": "08:42:05",
  "time_in_pm": null
}
```

## Break Schedule by Department
All departments share the same lunch break:
- **break_start_time**: 12:00:00
- **break_end_time**: 13:00:00
- **PM Late Threshold**: 13:01:00 (1 minute after break_end_time)

## Benefits

1. **Accurate PM Tracking**: Captures afternoon lateness separately
2. **Complete Picture**: Multiple statuses show all attendance issues
3. **Priority System**: Most critical issues shown first
4. **Flexible Display**: Frontend handles any status combination
5. **Clear Reporting**: Easy to identify employees with multiple issues

## Reprocessing
All 463 attendance records across 45 days have been reprocessed with the new logic.

Command to reprocess:
```bash
php artisan attendance:reprocess
```

## Summary
- **Late AM**: From work_start_time (no grace for payroll)
- **Late PM**: From break_end_time + 1 minute
- **Status**: Can be multiple, comma-separated
- **Priority**: Missed Log > Absent > Half Day > Late > Undertime > Present
