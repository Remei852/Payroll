# HR/Payroll Management System - Overview & Entity Relationship Diagram

## System Summary

This is a comprehensive **HR and Payroll Management System** built with Laravel (backend) and React (frontend). It automates the complete employee lifecycle from attendance tracking through payroll generation, with built-in compliance checks and audit trails.

### Core Functions

1. **Attendance Management**
   - Tracks employee clock-in/out logs from biometric or manual entry
   - Generates daily attendance records with time calculations
   - Supports multiple time slots (AM/PM with lunch breaks)
   - Calculates late minutes, overtime, undertime, and rendered hours
   - Audit trail for all attendance record modifications

2. **Violation Detection**
   - Automatically detects attendance violations (tardiness, absences, missing logs)
   - Configurable grace periods per department
   - Severity levels (Low, Medium, High)
   - Status tracking (Pending, Reviewed, Letter Sent)
   - Metadata storage for violation details

3. **Payroll Processing**
   - Multi-step wizard for payroll generation
   - Period-based payroll cycles (Weekly, Semi-Monthly, Monthly)
   - Attendance validation before payroll finalization
   - Automatic calculation of earnings and deductions
   - Support for multiple contribution types (SSS, PhilHealth, PagIBIG, Loans, etc.)
   - Payslip generation and printing

4. **Employee & Department Management**
   - Employee master data (code, name, position, hire date, daily rate)
   - Department organization with payroll frequency settings
   - Work schedule management (start/end times, breaks, grace periods)
   - Schedule overrides for special cases
   - Holiday management (Philippine holidays included)

5. **Contributions & Deductions**
   - Flexible contribution type setup (Government, Loans, Company, Other)
   - Fixed or percentage-based calculations
   - Employer share tracking
   - Effective date management for contribution changes

6. **Cash Advances**
   - Employee cash advance requests
   - Status tracking (Active, Deducted, Completed)
   - Integration with payroll for automatic deduction
   - Audit trail with creator and deduction timestamps

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CORE ORGANIZATIONAL ENTITIES                        │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   DEPARTMENTS    │
                              ├──────────────────┤
                              │ id (PK)          │
                              │ name             │
                              │ payroll_freq     │
                              │ is_active        │
                              │ deleted_at       │
                              └────────┬─────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │   EMPLOYEES      │  │ WORK_SCHEDULES   │  │ SCHEDULE_OVERRIDES
        ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
        │ id (PK)          │  │ id (PK)          │  │ id (PK)          │
        │ employee_code    │  │ dept_id (FK)     │  │ dept_id (FK)     │
        │ first_name       │  │ name             │  │ employee_id (FK) │
        │ last_name        │  │ work_start_time  │  │ override_date    │
        │ dept_id (FK)     │  │ work_end_time    │  │ schedule_id (FK) │
        │ position         │  │ break_start_time │  │ created_at       │
        │ daily_rate       │  │ break_end_time   │  └──────────────────┘
        │ hire_date        │  │ grace_period_min │
        │ employment_status│  │ is_working_day   │
        │ deleted_at       │  │ half_day_hours   │
        └────────┬─────────┘  └──────────────────┘
                 │
                 │ 1:N
                 │
    ┌────────────┴────────────┬──────────────────┐
    │                         │                  │
    ▼                         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ATTENDANCE_LOGS  │  │ATTENDANCE_RECORDS│  │ CASH_ADVANCES    │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ id (PK)          │  │ id (PK)          │  │ id (PK)          │
│ employee_code    │  │ employee_id (FK) │  │ employee_id (FK) │
│ log_datetime     │  │ attendance_date  │  │ amount           │
│ log_type (IN/OUT)│  │ schedule_id (FK) │  │ reason           │
│ location         │  │ time_in_am       │  │ status           │
│ source_file      │  │ time_out_lunch   │  │ created_by (FK)  │
│ created_at       │  │ time_in_pm       │  │ payroll_period_id│
└──────────────────┘  │ time_out_pm      │  │ deducted_at      │
                      │ late_minutes_am  │  │ created_at       │
                      │ late_minutes_pm  │  └──────────────────┘
                      │ overtime_minutes │
                      │ undertime_minutes│
                      │ rendered (0-1.0) │
                      │ missed_logs_count│
                      │ status           │
                      │ remarks          │
                      │ notes            │
                      │ reviewed_by (FK) │
                      │ reviewed_at      │
                      └────────┬─────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ATTENDANCE_REC_CHANGES│
                    ├──────────────────────┤
                    │ id (PK)              │
                    │ attendance_rec_id(FK)│
                    │ changed_by (FK)      │
                    │ field_name           │
                    │ old_value            │
                    │ new_value            │
                    │ reason               │
                    │ created_at           │
                    └──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                        VIOLATIONS & COMPLIANCE ENTITIES                      │
└─────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────────┐
        │ EMPLOYEES (FK)   │
        └────────┬─────────┘
                 │
                 ▼
    ┌──────────────────────────┐
    │ ATTENDANCE_VIOLATIONS    │
    ├──────────────────────────┤
    │ id (PK)                  │
    │ employee_id (FK)         │
    │ violation_date           │
    │ violation_type           │
    │ details                  │
    │ severity (Low/Med/High)  │
    │ status (Pending/Reviewed)│
    │ metadata (JSON)          │
    │ created_at               │
    └──────────────────────────┘

    ┌──────────────────────────┐
    │ DEPT_GRACE_PERIOD_SETTINGS
    ├──────────────────────────┤
    │ id (PK)                  │
    │ department_id (FK)       │
    │ grace_period_minutes     │
    │ created_at               │
    └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          PAYROLL ENTITIES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ DEPARTMENTS (FK) │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────┐
    │ PAYROLL_PERIODS      │
    ├──────────────────────┤
    │ id (PK)              │
    │ department_id (FK)   │
    │ start_date           │
    │ end_date             │
    │ payroll_date         │
    │ status (OPEN/CLOSED) │
    │ created_at           │
    └────────┬─────────────┘
             │
             │ 1:N
             │
    ┌────────┴──────────────┐
    │                       │
    ▼                       ▼
┌──────────────────┐  ┌──────────────────┐
│ PAYROLLS         │  │ CASH_ADVANCES    │
├──────────────────┤  ├──────────────────┤
│ id (PK)          │  │ (see above)      │
│ payroll_period_id│  └──────────────────┘
│ employee_id (FK) │
│ gross_pay        │
│ total_earnings   │
│ total_deductions │
│ net_pay          │
│ status (DRAFT)   │
│ generated_at     │
└────────┬─────────┘
         │
         ▼
    ┌──────────────────┐
    │ PAYROLL_ITEMS    │
    ├──────────────────┤
    │ id (PK)          │
    │ payroll_id (FK)  │
    │ type (EARN/DED)  │
    │ category         │
    │ amount           │
    │ reference_id     │
    │ created_at       │
    └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONTRIBUTIONS & DEDUCTIONS ENTITIES                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐
    │ CONTRIBUTION_TYPES       │
    ├──────────────────────────┤
    │ id (PK)                  │
    │ name (SSS, PhilHealth)   │
    │ category (Gov/Loan/Co)   │
    │ frequency (Monthly/etc)  │
    │ is_active                │
    │ created_at               │
    └────────┬─────────────────┘
             │
             │ 1:N
             │
    ┌────────┴──────────────────┐
    │                           │
    ▼                           ▼
┌──────────────────────┐  ┌──────────────────────┐
│ EMPLOYEE_CONTRIBUTIONS
├──────────────────────┤
│ id (PK)              │
│ employee_id (FK)     │
│ contribution_type_id │
│ calculation_type     │
│ amount_or_rate       │
│ employer_share_amt   │
│ effective_date       │
│ is_active            │
│ created_at           │
└──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      SYSTEM & REFERENCE ENTITIES                             │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ DEPARTMENTS (FK) │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ HOLIDAYS         │
    ├──────────────────┤
    │ id (PK)          │
    │ dept_id (FK)     │
    │ holiday_date     │
    │ holiday_name     │
    │ created_at       │
    └──────────────────┘

    ┌──────────────────┐
    │ USERS            │
    ├──────────────────┤
    │ id (PK)          │
    │ name             │
    │ email            │
    │ password         │
    │ created_at       │
    └──────────────────┘
```

---

## Key Relationships

### One-to-Many (1:N)
- **Department → Employees**: One department has many employees
- **Department → Work Schedules**: One department has many work schedules
- **Department → Payroll Periods**: One department has many payroll periods
- **Employee → Attendance Records**: One employee has many attendance records
- **Employee → Attendance Violations**: One employee has many violations
- **Employee → Cash Advances**: One employee has many cash advances
- **Employee → Employee Contributions**: One employee has many contributions
- **Payroll Period → Payrolls**: One period has many payrolls
- **Payroll → Payroll Items**: One payroll has many items
- **Contribution Type → Employee Contributions**: One type has many employee assignments
- **Attendance Record → Attendance Record Changes**: One record has many change logs

### Many-to-One (N:1)
- **Employees → Department**: Many employees belong to one department
- **Attendance Records → Employee**: Many records for one employee
- **Attendance Records → Work Schedule**: Many records use one schedule
- **Payrolls → Payroll Period**: Many payrolls in one period
- **Payrolls → Employee**: Many payrolls for one employee
- **Employee Contributions → Contribution Type**: Many employee assignments to one type

---

## Data Flow

### Attendance Processing Flow
```
Attendance Logs (raw data)
    ↓
Attendance Records (processed daily)
    ↓
Violation Detection (automated)
    ↓
Attendance Violations (flagged issues)
    ↓
Review & Edit (admin corrections)
    ↓
Attendance Record Changes (audit trail)
```

### Payroll Processing Flow
```
Payroll Period Created
    ↓
Attendance Records Validated
    ↓
Payroll Generated (DRAFT)
    ↓
Payroll Items Calculated
    ├─ Basic Pay (from daily_rate × rendered days)
    ├─ Late Penalties (from violations)
    ├─ Overtime (from overtime_minutes)
    ├─ Contributions (SSS, PhilHealth, etc.)
    └─ Cash Advances (deducted)
    ↓
Payroll Reviewed & Finalized
    ↓
Payslip Generated & Printed
```

---

## Key Features by Entity

### Attendance Records
- **Audit Trail**: Every change tracked in `attendance_record_changes`
- **Flexible Time Tracking**: Supports AM/PM sessions with lunch breaks
- **Rendered Hours**: Calculates work credit (1.0 = full day, 0.5 = half day, 0.0 = absent)
- **Late & Overtime Tracking**: Separate tracking for AM/PM lateness and overtime
- **Review Status**: Tracks who reviewed/edited and when

### Violations
- **Automatic Detection**: Triggered by attendance processing
- **Severity Levels**: Low, Medium, High for prioritization
- **Status Workflow**: Pending → Reviewed → Letter Sent
- **Metadata Storage**: JSON field for flexible violation details

### Payroll
- **Multi-Period Support**: Weekly, Semi-Monthly, Monthly cycles
- **Flexible Contributions**: Fixed or percentage-based calculations
- **Employer Shares**: Tracks employer contribution amounts
- **Draft & Finalized States**: Allows review before finalization

### Cash Advances
- **Status Tracking**: Active → Deducted → Completed
- **Payroll Integration**: Automatically deducted in payroll
- **Audit Trail**: Creator and deduction timestamps

---

## Database Indexes (Performance Optimization)

### Attendance Records
- `(employee_id, attendance_date)` - UNIQUE for data integrity
- `attendance_date` - For date range queries
- `status` - For filtering by status
- `reviewed_at` - For filtering reviewed records

### Attendance Logs
- `(log_datetime, employee_code)` - For date-based queries
- `source_file` - For filtering by uploaded file

### Attendance Violations
- `(employee_id, violation_date)` - For employee violation history
- `status` - For filtering by status
- `violation_type` - For filtering by type

### Cash Advances
- `(employee_id, status)` - For employee advance tracking
- `created_at` - For date-based queries

---

## System Architecture

**Backend**: Laravel 11 with PHP
- Service layer for business logic (AttendanceService, PayrollService, ViolationDetectionService)
- Repository pattern for data access
- Console commands for batch processing
- API controllers for frontend integration

**Frontend**: React with Inertia.js
- Multi-step payroll wizard
- Attendance record editing with modal
- Violation filtering and details
- Payslip generation and printing
- Settings management UI

**Database**: MySQL/PostgreSQL/SQLite compatible
- Soft deletes for data retention
- Generated columns for computed values
- Performance indexes on frequently queried fields
- Audit trail tables for compliance

