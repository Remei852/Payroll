# CSV Processing Performance Optimization

## Problem
Previously, every CSV upload would reprocess ALL dates from the entire `attendance_logs` table history, causing performance issues as data accumulated over time.

**Example of old behavior:**
- Month 1: Upload CSV (Feb 1-7) → Process Feb 1-7 (7 days)
- Month 2: Upload CSV (Feb 8-14) → Process Feb 1-14 (14 days) ❌
- Month 3: Upload CSV (Feb 15-21) → Process Feb 1-21 (21 days) ❌
- Month 6: Upload CSV (Jul 1-7) → Process Feb 1-Jul 7 (157 days) ❌❌❌

## Solution Implemented
Now the system only processes dates from the newly uploaded CSV file.

**New behavior:**
- Month 1: Upload CSV (Feb 1-7) → Process Feb 1-7 (7 days) ✅
- Month 2: Upload CSV (Feb 8-14) → Process Feb 8-14 (7 days) ✅
- Month 3: Upload CSV (Feb 15-21) → Process Feb 15-21 (7 days) ✅
- Month 6: Upload CSV (Jul 1-7) → Process Jul 1-7 (7 days) ✅

## Changes Made

### 1. New Method in AttendanceService
Added `getNewlyUploadedLogsDateRange(string $sourceFile)` method that:
- Filters logs by `source_file` (CSV filename)
- Returns only the date range from that specific CSV
- Much faster than scanning all historical logs

### 2. Updated AttendanceController
Changed `storeUpload()` method to use the new method:
```php
// OLD: Process all dates from entire history
$dateRange = $this->service->getUploadedLogsDateRange();

// NEW: Process only dates from new CSV
$dateRange = $this->service->getNewlyUploadedLogsDateRange($originalName);
```

### 3. Database Indexes Added

**attendance_logs table:**
- `index(['log_datetime', 'employee_code'])` - Speeds up date-based queries
- `index('source_file')` - Speeds up filtering by CSV file

**attendance_records table:**
- `unique(['employee_id', 'attendance_date'])` - Ensures data integrity
- `index('attendance_date')` - Speeds up date range queries
- `index('status')` - Speeds up status filtering

## Benefits

### Performance
- **Fast uploads**: Only processes relevant dates (typically 7-14 days)
- **Consistent speed**: Performance doesn't degrade as data accumulates
- **Scalable**: Works efficiently even with years of historical data

### Flexibility
- **Handles overlaps**: If admin re-exports same dates, they get reprocessed
- **Handles corrections**: Can upload corrected CSV for specific dates
- **Handles late logs**: Can upload missed logs and they'll be processed

### Data Integrity
- Uses `updateOrCreate` so reprocessing updates existing records
- Unique constraint prevents duplicate records
- All logs for a date are always considered together

## Usage

### Normal Weekly Upload
1. Export CSV from biometric device (e.g., Feb 1-7)
2. Upload to system
3. System automatically processes only Feb 1-7
4. Fast and efficient ✅

### Re-upload for Corrections
1. Notice issue with Feb 3 data
2. Re-export Feb 1-7 from device
3. Upload to system
4. System reprocesses Feb 1-7 with all logs (old + any new)
5. Attendance records updated ✅

### Manual Reprocess (if needed)
The existing "Process Logs" button with date range selector is still available for manual reprocessing if needed.

## Technical Details

**Database Driver Support:**
- PostgreSQL ✅
- MySQL ✅
- SQLite ✅ (fallback for generated columns)

**Migration Status:**
- All migrations applied successfully
- Indexes created and active
- No data loss during migration

## Testing Recommendations

1. Upload a CSV with 1 week of data → Verify fast processing
2. Upload another CSV with next week → Verify only new week processed
3. Re-upload first week CSV → Verify reprocessing works
4. Check logs to confirm date ranges are correct
