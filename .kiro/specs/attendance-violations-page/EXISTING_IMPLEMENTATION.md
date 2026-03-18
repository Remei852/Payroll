# Existing Implementation Analysis

## What Already Exists

### 1. Database Schema
✅ **attendance_violations table** - Migration already exists at `database/migrations/2026_02_26_080429_create_attendance_violations_table.php`

**Existing columns:**
- `id` (primary key)
- `employee_id` (foreign key to employees)
- `violation_date` (date)
- `violation_type` (string)
- `details` (text, nullable)
- `severity` (enum: Low, Medium, High) - **NOTE: Missing 'Critical' option**
- `status` (enum: Pending, Reviewed, Letter Sent)
- `metadata` (json, nullable)
- `created_at`, `updated_at` (timestamps)
- Indexes on: employee_id+violation_date, status, violation_type

**Missing columns for manual review workflow:**
- `notes` (TEXT NULL) - for admin comments
- `dismissed_at` (TIMESTAMP NULL) - for soft delete
- `dismissed_by` (BIGINT UNSIGNED NULL) - foreign key to users

### 2. Basic Violation Detection Logic
✅ **AttendanceService.php** already has a `detectViolations()` method (line 1637)

**Currently detects 7 violation types:**
1. Multiple Logs (>4 logs or duplicates)
2. Missing Log (missed_logs_count > 0)
3. Early Lunch OUT (before 11:55 AM)
4. Late Lunch OUT (after 12:15 PM)
5. Early Lunch IN (before 12:55 PM)
6. Excessive Late (>15 minutes)
7. Excessive Undertime (>5 minutes)

**Violations are created inline** during attendance processing (not in a separate batch process)

### 3. Frontend Structure
✅ **Violations folder exists** at `resources/js/Pages/Violations/` but is **empty**

✅ **Settings page exists** at `resources/js/Pages/Settings/Index.jsx` with tab structure
- Currently has 2 tabs: Work Schedules, Schedule Overrides & Holidays
- Can easily add a third tab for Grace Period Settings

### 4. What Does NOT Exist Yet

❌ **AttendanceViolation model** - needs to be created
❌ **ViolationsController** - needs to be created
❌ **ViolationDetectionService** - needs to be created (separate from AttendanceService)
❌ **DepartmentGracePeriodSettings model** - needs to be created
❌ **department_grace_period_settings table** - migration needs to be created
❌ **React components** for violations page - all need to be created
❌ **Routes** for violations - need to be added
❌ **Scheduled command** for daily detection - needs to be created

## Key Differences from Spec

### 1. Severity Enum
**Existing:** `['Low', 'Medium', 'High']`
**Spec requires:** `['Low', 'Medium', 'High', 'Critical']`
**Action:** Need to add 'Critical' to enum via migration

### 2. Violation Detection Approach
**Existing:** Inline detection during attendance processing (real-time)
**Spec requires:** Separate batch process via scheduled command (daily at 11 PM)
**Action:** Can keep existing inline detection AND add batch detection service

### 3. Violation Types
**Existing (7 types):**
- Multiple Logs
- Missing Log
- Early Lunch OUT
- Late Lunch OUT
- Early Lunch IN
- Excessive Late
- Excessive Undertime

**Spec requires (9 types):**
- Cumulative Grace Period Exceeded (NEW)
- Unexcused Absence (NEW)
- AWOL (NEW)
- Biometrics Policy Violation (NEW)
- Missing Logs (similar to existing "Missing Log")
- Excessive Logs (similar to existing "Multiple Logs")
- Unauthorized Work (NEW)
- Excessive Undertime (EXISTS)
- Frequent Half Day (NEW)

**Action:** 
- Keep existing 7 types for backward compatibility
- Add 9 new types from spec
- May have some overlap/duplication (e.g., "Missing Log" vs "Missing Logs")

## Recommendations

### Option 1: Extend Existing System (Recommended)
1. Keep existing `detectViolations()` method in AttendanceService for real-time detection
2. Create new ViolationDetectionService for batch/pattern detection (AWOL, frequent patterns, etc.)
3. Add migration to extend attendance_violations table (add 'Critical' to severity, add notes/dismissed fields)
4. Create AttendanceViolation model with scopes and relationships
5. Build frontend components from scratch

**Pros:**
- Preserves existing functionality
- No breaking changes
- Can run both real-time and batch detection

**Cons:**
- Some duplication between services
- Need to coordinate between two detection systems

### Option 2: Refactor Completely
1. Move all violation detection to ViolationDetectionService
2. Remove `detectViolations()` from AttendanceService
3. Run all detection as batch process

**Pros:**
- Cleaner architecture
- Single source of truth

**Cons:**
- Breaking change
- Loses real-time violation detection
- More risky

## Recommended Task Adjustments

### Tasks to SKIP (already done):
- ❌ Task 1.1: Create attendance_violations migration (already exists, just needs extension)

### Tasks to MODIFY:
- ✏️ Task 1.2: Change from "Create migration" to "Extend existing migration" - add notes, dismissed_at, dismissed_by, and 'Critical' to severity enum
- ✏️ Task 2.1: ViolationDetectionService should focus on NEW violation types (grace period, AWOL, patterns) - existing types already handled by AttendanceService
- ✏️ Task 8.1: DetectViolationsCommand should call BOTH AttendanceService (for existing types) AND ViolationDetectionService (for new types)

### Tasks to ADD:
- ➕ Create migration to add 'Critical' to severity enum
- ➕ Decide on handling duplicate violation types (Multiple Logs vs Excessive Logs, Missing Log vs Missing Logs)
