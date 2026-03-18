# Attendance System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Key Features](#key-features)
3. [Attendance Processing Logic](#attendance-processing-logic)
4. [Recent Fixes and Improvements](#recent-fixes-and-improvements)
5. [User Guide](#user-guide)
6. [Technical Reference](#technical-reference)

---

## System Overview

The Attendance System is a comprehensive solution for tracking employee attendance, processing biometric logs, and generating reports. It handles complex scenarios including misclicked logs, missed logs, late arrivals, overtime, and special work schedules.

### Core Principles
- **No work, no pay** policy
- **Time-slot based** log processing (not pair-based)
- **Automatic misclick correction** using time-based inference
- **Flexible scheduling** with overrides for special circumstances

---

## Key Features

### 1. Automated Log Processing
- Upload CSV files from biometric devices
- Automatic processing of logs into attendance records
- Intelligent handling of misclicked logs
- Double-tap detection and removal

### 2. Time-Slot Approach
The system uses 4 time slots instead of simple IN/OUT pairs:
- **Morning IN**: 6:00 AM - 11:59 AM
- **Lunch OUT**: 11:00 AM - 12:44 PM  
- **Lunch IN**: 12:45 PM onwards
- **Afternoon OUT**: Last OUT after 12:45 PM

### 3. Misclick Detection
Employees often press the wrong button. The system:
- Ignores the `log_type` field
- Infers correct type based on time and sequence
- Applies lunch boundary rule (12:45 PM)
- Removes double-taps (< 2 minutes apart)

### 4. Schedule Overrides
HR can create overrides for:
- Sunday work
- Holiday work
- No work days (typhoons, etc.)
- Special schedules
- Employee-specific or department-wide

### 5. Unauthorized Work Tracking
- Employees who work on non-working days without authorization are now visible
- Status: "Present - Unauthorized Work Day"
- HR can approve retroactively by creating override

---

## Attendance Processing Logic

### Step-by-Step Process

#### Step 1: Collect Logs
- Get all logs for the date
- Sort by timestamp ascending

#### Step 2: Remove Duplicates
- Remove exact duplicates (same time, same type)

#### Step 3: Remove Double-Taps
- Remove logs < 2 minutes apart
- Keep the first log, skip the second

#### Step 4: Infer Log Types
- Ignore `log_type` field (employees misclick)
- Infer IN/OUT based on time and position
- Apply lunch boundary rule (12:45 PM)

#### Step 5: Assign to Time Slots
- Morning IN: First IN before 12:00 PM
- Lunch OUT: First OUT before 12:45 PM
- Lunch IN: First IN at/after 12:45 PM
- Afternoon OUT: Last OUT after 12:45 PM

#### Step 6: Pair IN-OUT Logs
- Create pairs for duration calculation
- Handle single pair (auto-deduct lunch if crosses lunch hours)
- Handle multiple pairs (lunch already excluded)

#### Step 7: Calculate Metrics
- Total worked hours
- Late minutes (AM and PM separately)
- Overtime minutes (only if 1+ hour after end time)
- Missed logs count

#### Step 8: Determine Status
- Present, Absent, Late, Half Day, Undertime, Missed Log
- Special statuses: Holiday, Sunday Work, Unauthorized Work

#### Step 9: Calculate Workday Rendered
- 1.0 = Full day
- 0.5 = Half day
- 0.0 = Absent

### Half Day Logic

Based on time slot presence, NOT hours:
- **Full Day**: Has morning IN AND afternoon OUT
- **Half Day - Morning**: Has morning IN, no afternoon OUT
- **Half Day - Afternoon**: No morning IN, has afternoon OUT

### Late Calculation

**Morning Late:**
- Compare morning IN against schedule start time
- Grace period: 15 minutes
- Late if arrival > start time + 15 minutes

**Afternoon Late:**
- Compare lunch IN against break end time
- Late if return > break end + 1 minute

### Overtime Calculation

- Must work at least 1 hour after schedule end time to qualify
- Overtime calculated from schedule end time (includes the 1 hour threshold)

---

## Recent Fixes and Improvements

### 1. Unauthorized Work Display (Feb 25, 2026)
**Problem:** Employees who worked on Sunday without override were invisible in attendance page.

**Solution:** System now creates records for all employees with logs, regardless of authorization.

**Status:** "Present - Unauthorized Work Day"

**Benefit:** HR can see who worked without pre-approval and create override retroactively if needed.

### 2. Employee-Specific Override Fix
**Problem:** Creating override for one employee affected entire department.

**Solution:** Implemented priority-based override checking:
1. Employee-specific (many-to-many)
2. Employee-specific (single)
3. Department-wide (no employee restrictions)

**Benefit:** Only selected employees are affected by overrides.

### 3. Half Day Logic Fix
**Problem:** Employees with morning IN and afternoon OUT marked as "Half Day" due to missed lunch logs.

**Solution:** Changed from hours-based to time-slot presence-based logic.

**Benefit:** More accurate half-day detection, not affected by pairing issues.

### 4. Auto-Reprocess on Override Changes
**Problem:** HR had to manually reprocess attendance after creating/updating/deleting overrides.

**Solution:** System automatically reprocesses attendance when overrides are modified.

**Benefit:** Immediate effect of override changes, no manual intervention needed.

### 5. Time-Slot Parameter Bug Fix
**Problem:** `$timeSlots` variable was used in `determineAttendanceStatus()` but not passed as parameter.

**Solution:** Added `$timeSlots` parameter to function signature and call.

**Benefit:** No undefined variable errors, proper half-day detection.

---

## User Guide

### For HR: Uploading Logs

1. Go to **Attendance → Upload Logs**
2. Click **Upload CSV** button
3. Select CSV file from biometric device
4. System automatically:
   - Uploads logs
   - Processes logs into attendance records
   - Displays results

### For HR: Viewing Attendance Records

1. Go to **Attendance → Attendance Records**
2. Use filters:
   - **Search**: Employee name or code
   - **Department**: Filter by department
   - **Status**: Filter by attendance status
   - **Date Range**: Filter by date range
3. Click **View Details** to see daily breakdown
4. Summary shows:
   - Workday rendered
   - Total absences
   - Total late (HH:MM)
   - Total overtime
   - Total missed logs

### For HR: Creating Schedule Overrides

1. Go to **Settings → Schedule Overrides**
2. Click **Add Override**
3. Fill in:
   - **Date**: Override date
   - **Department**: Select department
   - **Employees**: Select specific employees (optional)
   - **Type**: Sunday work, Holiday, No work, etc.
   - **Reason**: Explanation
4. Click **Save**
5. System automatically reprocesses attendance for that date

### For HR: Approving Unauthorized Work

**Scenario:** Employee worked on Sunday without pre-approval

1. Go to **Attendance → Attendance Records**
2. Filter by date (the Sunday)
3. See employees with "Present - Unauthorized Work Day"
4. Decide to approve or reject
5. If approve:
   - Go to **Settings → Schedule Overrides**
   - Create Sunday work override for that employee
   - System automatically updates status to "Present - Sunday Work"

---

## Technical Reference

### File Structure

```
app/
├── Services/
│   └── AttendanceService.php          # Main processing logic
├── Http/
│   └── Controllers/
│       ├── AttendanceController.php   # Attendance routes
│       └── ScheduleOverrideController.php  # Override management
├── Models/
│   ├── AttendanceLog.php              # Raw biometric logs
│   ├── AttendanceRecord.php           # Processed attendance
│   ├── Employee.php
│   ├── WorkSchedule.php
│   ├── ScheduleOverride.php
│   └── Holiday.php
└── Console/
    └── Commands/
        ├── ProcessAttendanceLogs.php
        └── ReprocessAttendance.php

resources/js/Pages/Attendance/
├── Index.jsx                          # Attendance menu
├── Records.jsx                        # Attendance records page
└── Summary.jsx                        # Summary reports
```

### Database Tables

**attendance_logs**
- Raw logs from biometric device
- Fields: employee_code, log_datetime, log_type, location, source_file

**attendance_records**
- Processed attendance records
- Fields: employee_id, attendance_date, time_in_am, time_out_lunch, time_in_pm, time_out_pm, late_minutes_am, late_minutes_pm, total_late_minutes, overtime_minutes, workday_rendered, missed_logs_count, status, remarks

**schedule_overrides**
- Special schedule overrides
- Fields: override_date, department_id, employee_id, override_type, reason, schedule_id, is_paid

**schedule_override_employee** (pivot table)
- Many-to-many relationship for employee-specific overrides
- Fields: schedule_override_id, employee_id

### Key Constants

```php
GRACE_PERIOD_MINUTES = 15           // Late grace period
EARLY_OUT_ALLOWANCE_MINUTES = 5     // Undertime allowance
LUNCH_BREAK_START = '12:00:00'      // Standard lunch start
LUNCH_BREAK_END = '13:00:00'        // Standard lunch end
LUNCH_BOUNDARY = 765                // 12:45 PM in minutes (765)
```

### Status Values

| Status | Meaning | Workday |
|--------|---------|---------|
| Present | Normal attendance | 1.0 |
| Late | Arrived late | 1.0 |
| Absent | Did not show up | 0.0 |
| Half Day | Only morning or afternoon | 0.5 |
| Undertime | Left early | 1.0 |
| Missed Log | Missing some logs | 1.0 |
| Present - Holiday | Worked on holiday | 1.0 |
| Present - Sunday Work | Authorized Sunday work | 1.0 |
| Present - Unauthorized Work Day | Worked without authorization | 1.0 |
| Absent - Excused | Excused absence (no work expected) | 0.0 |

### API Endpoints

```php
// Attendance
POST   /admin/attendance/store-upload      // Upload CSV
POST   /admin/attendance/process-logs      // Process logs
GET    /admin/attendance/records           // View records
GET    /admin/attendance/logs              // View raw logs

// Schedule Overrides
GET    /admin/schedule-overrides           // List overrides
POST   /admin/schedule-overrides           // Create override
PUT    /admin/schedule-overrides/{id}      // Update override
DELETE /admin/schedule-overrides/{id}      // Delete override
```

### Artisan Commands

```bash
# Process attendance logs for date range
php artisan attendance:process --start=2026-02-01 --end=2026-02-15

# Reprocess attendance (delete and recreate records)
php artisan attendance:reprocess --date=2026-02-01

# Check attendance data
php artisan attendance:check --date=2026-02-01
```

---

## Troubleshooting

### Issue: Employee marked as "Half Day" but worked full day

**Cause:** Missing lunch logs due to misclick or forgot to log

**Solution:** System now uses time-slot presence logic. If employee has morning IN and afternoon OUT, they get full day credit even with missed lunch logs.

### Issue: Employee worked on Sunday but not showing in attendance

**Cause:** No schedule override created

**Solution:** As of Feb 25, 2026, system now shows all employees with logs, even without override. Status will be "Present - Unauthorized Work Day". HR can create override retroactively to approve.

### Issue: Override for one employee affects entire department

**Cause:** Old bug in override checking logic

**Solution:** Fixed. System now checks employee-specific overrides first, then department-wide. Only selected employees are affected.

### Issue: Late calculation seems wrong

**Cause:** System was using pair-based times instead of time-slot times

**Solution:** Fixed. System now uses time-slot based times for late calculation, which is more accurate.

---

## Best Practices

### For HR

1. **Upload logs regularly** - Don't wait until end of month
2. **Review unauthorized work** - Check for "Unauthorized Work Day" status
3. **Create overrides in advance** - For planned Sunday work or holidays
4. **Use date filters** - To focus on specific payroll periods
5. **Check missed logs** - Red rows indicate missing logs

### For Employees

1. **Log correctly** - Press correct button (IN/OUT)
2. **Don't double-tap** - Wait at least 2 minutes between logs
3. **Follow schedule** - Arrive on time, return from lunch on time
4. **Complete all logs** - Morning IN, Lunch OUT, Lunch IN, Afternoon OUT

### For System Administrators

1. **Regular backups** - Backup attendance_logs and attendance_records tables
2. **Monitor processing** - Check logs for errors
3. **Keep schedules updated** - Ensure work_schedules table is accurate
4. **Test overrides** - Verify overrides work as expected before payroll

---

## Version History

### v2.0 (February 25, 2026)
- ✅ Unauthorized work display feature
- ✅ Employee-specific override fix
- ✅ Half day logic improvement
- ✅ Auto-reprocess on override changes
- ✅ Time-slot parameter bug fix
- ✅ Code cleanup (removed unused methods)

### v1.0 (February 2026)
- Initial release
- Time-slot based processing
- Misclick detection
- Schedule overrides
- Attendance reports

---

## Support

For issues or questions:
1. Check this documentation first
2. Review the troubleshooting section
3. Check application logs in `storage/logs/laravel.log`
4. Contact system administrator

---

**Last Updated:** February 25, 2026
**Status:** Production Ready ✅

