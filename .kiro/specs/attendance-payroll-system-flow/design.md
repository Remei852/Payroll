# Comprehensive Design Document
## Attendance & Payroll System Flow

---

## Overview

This design document consolidates the complete architecture for the Attendance and Payroll System, integrating three core domains:

1. **Attendance Processing** - Raw log import, auto-processing, violation detection, human review
2. **Payroll Calculation** - Period management, payroll generation, deduction application
3. **Cash Advances** - Advance creation, tracking, and payroll integration

The system processes employee attendance records, detects violations, calculates accurate payroll with deductions, and manages cash advances with full audit trails.

---

## System Architecture Overview

```mermaid
graph TB
    subgraph Attendance["Attendance Processing"]
        A1["CSV Upload"] --> A2["Parse & Store Logs"]
        A2 --> A3["Process Logs"]
        A3 --> A4["Detect Violations"]
        A4 --> A5["Human Review"]
        A5 --> A6["Final Records"]
    end
    
    subgraph Payroll["Payroll Calculation"]
        P1["Create Period"] --> P2["Generate Payroll"]
        P2 --> P3["Calculate Components"]
        P3 --> P4["Apply Deductions"]
        P4 --> P5["Review & Finalize"]
        P5 --> P6["Generate Payslips"]
    end
    
    subgraph CashAdv["Cash Advances"]
        C1["Create Advance"] --> C2["Track Status"]
        C2 --> C3["Apply Deduction"]
        C3 --> C4["Complete"]
    end
    
    A6 --> P2
    A4 --> P4
    C2 --> P4
    P6 --> D["Distribution"]
    
    style Attendance fill:#e3f2fd
    style Payroll fill:#f3e5f5
    style CashAdv fill:#e8f5e9


---

## 1. Database Schema Design

### 1.1 Entity-Relationship Diagram

The system uses a normalized PostgreSQL schema with the following core entities:

- **attendance_logs** - Immutable raw biometric logs
- **attendance_records** - Processed daily attendance with metrics
- **attendance_violations** - Detected policy violations
- **payroll_periods** - Payroll processing periods
- **payrolls** - Employee payroll records
- **payroll_items** - Earnings and deductions breakdown
- **cash_advances** - Employee cash advance requests
- **employees** - Employee master data
- **departments** - Department organization
- **work_schedules** - Department work schedules
- **holidays** - Public holidays
- **schedule_overrides** - Special day overrides

### 1.2 Core Table Structures

**attendance_logs** - Immutable raw logs
```
id, employee_id, log_datetime, log_type (IN/OUT), device_id, 
branch_id, source_file, processed, created_at, updated_at
```

**attendance_records** - Processed daily records
```
id, employee_id, attendance_date, schedule_id, time_in_am, 
time_out_lunch, time_in_pm, time_out_pm, late_minutes_am, 
late_minutes_pm, undertime_minutes, overtime_minutes, rendered, 
confidence_score, status (clean/flagged), reviewed_by, reviewed_at
```

**attendance_violations** - Detected violations
```
id, attendance_record_id, employee_id, attendance_date, 
violation_type, severity, description, resolved, resolution_notes, 
resolved_by, resolved_at
```

**payroll_periods** - Payroll processing periods
```
id, department_id, start_date, end_date, payroll_date, status 
(OPEN/CLOSED), created_by, finalized_by, finalized_at
```

**payrolls** - Employee payroll records
```
id, payroll_period_id, employee_id, basic_pay, overtime_pay, 
gross_pay, total_earnings, total_deductions, net_pay, status 
(DRAFT/FINALIZED), notes
```

**payroll_items** - Earnings and deductions
```
id, payroll_id, type (EARNING/DEDUCTION), category, amount, 
reference_type, reference_id
```

**cash_advances** - Cash advance requests
```
id, employee_id, amount, reason, status (Active/Completed), 
created_by, deduction_date, payroll_period_id
```

### 1.3 Performance Indexes

Strategic indexes on frequently queried columns:
- `idx_attendance_logs_employee_datetime` - Log processing queries
- `idx_attendance_records_employee_date` - Record lookups
- `idx_payrolls_period_employee` - Payroll queries
- `idx_violations_severity_date` - Violation reporting
- `idx_payroll_items_payroll_type` - Item breakdown queries

---

## 2. API Architecture & Endpoints

### 2.1 RESTful Endpoint Structure

**Attendance Management**
```
GET    /api/attendance/logs              - List raw logs
POST   /api/attendance/logs/import       - Import CSV
GET    /api/attendance/records           - List records
GET    /api/attendance/records/{id}      - Get record details
PUT    /api/attendance/records/{id}      - Update record
GET    /api/attendance/violations        - List violations
PUT    /api/attendance/violations/{id}   - Update violation
GET    /api/attendance/reviews           - Get review queue
POST   /api/attendance/reviews/{id}/approve - Approve
```

**Payroll Management**
```
GET    /api/payroll/periods              - List periods
POST   /api/payroll/periods              - Create period
GET    /api/payroll/periods/{id}         - Get period details
POST   /api/payroll/periods/{id}/generate - Generate payroll
GET    /api/payroll/{id}                 - Get payroll details
PUT    /api/payroll/{id}                 - Update payroll
POST   /api/payroll/{id}/finalize        - Finalize payroll
GET    /api/payroll/{id}/payslip         - Get payslip
POST   /api/payroll/periods/{id}/finalize - Finalize period
```

**Cash Advances**
```
GET    /api/cash-advances                - List advances
POST   /api/cash-advances                - Create advance
GET    /api/cash-advances/{id}           - Get advance details
DELETE /api/cash-advances/{id}           - Delete advance
GET    /api/employees/{id}/cash-advances - Get employee advances
```

### 2.2 Response Format

All API responses follow a consistent JSON structure:

**Success Response**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

**Error Response**
```json
{
  "success": false,
  "message": "Validation failed",
  "error_code": "VALIDATION_ERROR",
  "errors": { /* field errors */ }
}
```

### 2.3 Authentication & Authorization

- **Authentication**: Sanctum API tokens
- **Authorization**: Role-based access control (Admin, HR Manager, Employee)
- **Row-Level Security**: Employees can only view own payslips
- **Permission Checking**: Fine-grained permissions for actions

---

## 3. Service Layer Architecture

### 3.1 Core Services

**AttendanceService**
- CSV import and parsing
- Log processing and record creation
- Attendance calculation (late, undertime, overtime)
- Batch processing for date ranges
- Double-tap filtering and rapid re-tap handling
- Time slot assignment and confidence scoring

**ViolationDetectionService**
- Structural violation detection (missing logs, ambiguous patterns)
- Policy violation detection (grace period, absence, AWOL)
- Ambiguity scoring and categorization
- Violation severity determination

**ReviewService**
- Review queue management
- Suggestion approval/rejection
- Manual corrections and bulk operations
- Audit trail for all reviews

**PayrollService**
- Payroll period management
- Payroll generation for employees
- Payroll calculation and composition
- Period finalization and locking

**CashAdvanceService**
- Cash advance creation and tracking
- Deduction application during payroll
- Balance tracking and status management
- Integration with payroll finalization

**PayslipService**
- Payslip generation and formatting
- PDF generation
- Distribution tracking

### 3.2 Service Dependencies

```
PayrollService
├── AttendanceRepository
├── ViolationRepository
├── CashAdvanceRepository
└── PayslipService

AttendanceService
├── AttendanceLogRepository
├── AttendanceRecordRepository
├── WorkScheduleRepository
└── ViolationDetectionService

ViolationDetectionService
├── AttendanceViolationRepository
└── DepartmentGracePeriodSettings
```

---

## 4. Data Flow & Integration Patterns

### 4.1 Attendance Processing Flow

```
CSV Upload
  ↓
Parse & Validate
  ↓
Store in attendance_logs (immutable)
  ↓
Process Logs
  ├─ Filter double-taps (within 2 min)
  ├─ Handle rapid re-taps (IN-OUT-IN within 5 min)
  ├─ Assign to time slots
  └─ Calculate confidence score
  ↓
Create attendance_records
  ├─ Calculate late minutes
  ├─ Calculate undertime minutes
  ├─ Calculate overtime minutes
  └─ Calculate rendered hours
  ↓
Detect Violations
  ├─ Structural violations
  ├─ Policy violations
  └─ Ambiguity detection
  ↓
Review Queue (if flagged)
  ├─ Display to HR
  ├─ Allow corrections
  └─ Approve or reject
  ↓
Final Records (ready for payroll)
```

### 4.2 Payroll Calculation Flow

```
Attendance Records
├─ Days Worked (rendered)
├─ Late Minutes
├─ Overtime Minutes
└─ Undertime Minutes
  ↓
Calculate Basic Pay = Days Worked × Daily Rate
  ↓
Calculate Overtime Pay = (Overtime Minutes ÷ 60) × Hourly Rate × 1.25
  ↓
Calculate Gross Pay = Basic Pay + Overtime Pay
  ↓
Calculate Deductions
├─ Late Penalty = (Late Minutes ÷ 60) × Hourly Rate
├─ Undertime Penalty = (Undertime Minutes ÷ 60) × Hourly Rate
├─ Contributions (SSS, PhilHealth, Pag-IBIG)
├─ Violation Deductions
└─ Cash Advance Deductions
  ↓
Calculate Net Pay = Gross Pay - Total Deductions
  ↓
Create Payroll Items (earnings and deductions)
  ↓
Final Payroll Record
```

### 4.3 Violation Deduction Rules

- **Cumulative Grace Period Violation**: (Duration Minutes ÷ 60) × Hourly Rate
- **Unexcused Absence**: 1.0 × Daily Rate
- **AWOL (Absent Without Leave)**: 3.0 × Daily Rate

### 4.4 Cash Advance Integration

```
Cash Advance Created (Status: Active)
  ↓
During Payroll Generation
├─ Display active advances
├─ Admin selects advances to deduct
└─ Create PayrollItem (Cash Advance category)
  ↓
Update Cash Advance Status
├─ Status: Applied
├─ Deduction Date: Set
└─ Payroll Period: Linked
  ↓
During Payroll Finalization
├─ Update status: Completed
└─ Record completion date
  ↓
Payslip Display
├─ Show cash advance deduction
├─ Show remaining balance
└─ Show deduction date
```

---

## 5. Frontend Component Architecture

### 5.1 Page Structure

**Attendance Module**
- Attendance Summary - Overview and statistics
- Raw Logs - View and manage raw biometric logs
- Violations - View and resolve violations
- Review Queue - Manual review of flagged records

**Payroll Module**
- Payroll Periods - List and manage periods
- Generate Payroll - Create new payroll period
- Period Details - View payroll summary and employee records
- Payslip - View and print individual payslips

**Cash Advances Module**
- Advances List - View all advances
- Create Advance - Create new advance request
- Deduction History - Track deduction history

**Settings Module**
- Grace Period Settings - Configure grace periods per department
- Work Schedules - Manage work schedules
- Processing Configuration - System configuration

### 5.2 Reusable Components

- **DataTable** - Sortable, filterable, paginated table
- **Modal** - Dialog for forms and confirmations
- **Form** - Reusable form with validation
- **StatusBadge** - Status indicator with color coding
- **ConfirmDialog** - Confirmation dialog for actions
- **LoadingSpinner** - Loading indicator
- **ErrorAlert** - Error message display

### 5.3 State Management

- **Inertia.js** - Server-side state management
- **React Context API** - Client-side global state
- **Component State** - Local component state for UI

---

## 6. Performance & Scalability

### 6.1 Database Performance

- **Query Optimization**: Eager loading, selective fields, proper indexes
- **Batch Processing**: Process 1000 records at a time
- **Caching**: Cache employee data, configuration, payroll summaries
- **Expected Performance**: Generate payroll for 1000 employees in < 5 minutes

### 6.2 API Performance

- **Response Time**: < 200ms for typical requests
- **Pagination**: 50 records per page for large datasets
- **Compression**: Gzip compression for responses
- **Rate Limiting**: Prevent abuse with rate limiting

### 6.3 Caching Strategy

- **Employee Data**: Cache for 1 hour
- **Configuration**: Cache for 24 hours
- **Payroll Summaries**: Cache for 30 minutes
- **Cache Invalidation**: Clear on data changes

### 6.4 Horizontal Scaling

- **Stateless Services**: Services don't maintain state
- **Load Balancing**: Distribute requests across servers
- **Database Replication**: Read replicas for reporting
- **Distributed Caching**: Redis for distributed caching

---

## 7. Security & Error Handling

### 7.1 Security Measures

- **Authentication**: Sanctum API tokens
- **Authorization**: Role-based access control
- **Data Encryption**: Sensitive data encrypted at rest
- **HTTPS**: All communication over HTTPS
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries
- **Audit Trail**: All actions logged with user and timestamp

### 7.2 Error Handling

- **Input Validation**: Validate all inputs before processing
- **Business Logic Validation**: Check constraints (dates, rates, etc.)
- **Exception Handling**: Catch and handle exceptions gracefully
- **Logging**: Log all errors with context
- **User Notification**: Inform users of errors
- **Recovery**: Implement retry logic for transient failures

### 7.3 Data Consistency

- **Transactions**: Use database transactions for consistency
- **Rollback**: Rollback on error to maintain consistency
- **Validation**: Validate data at each step
- **Audit Trail**: Track all changes for debugging

### 7.4 Audit & Compliance

- **Audit Trail**: All actions logged with user and timestamp
- **Immutable Logs**: attendance_logs never modified after creation
- **Compliance Reports**: Generate reports for government compliance
- **Data Retention**: Historical records maintained for audit

---

## 8. Deployment & Configuration

### 8.1 Environment Configuration

```
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=payroll
DB_USERNAME=payroll_user
DB_PASSWORD=secure_password

CACHE_DRIVER=redis
QUEUE_DRIVER=database

APP_DEBUG=false
APP_ENV=production
```

### 8.2 Application Configuration

```php
// Processing configuration
DOUBLE_TAP_THRESHOLD = 2 minutes
RAPID_RETAP_THRESHOLD = 5 minutes
SHORT_SESSION_THRESHOLD = 4 hours
LONG_LUNCH_THRESHOLD = 2 hours
AMBIGUOUS_CONFIDENCE_THRESHOLD = 70%

// Payroll configuration
OVERTIME_MULTIPLIER = 1.25
LATE_PENALTY_CALCULATION = (minutes ÷ 60) × hourly_rate
UNDERTIME_PENALTY_CALCULATION = (minutes ÷ 60) × hourly_rate
AWOL_DEDUCTION_DAYS = 3
```

### 8.3 Deployment Process

1. **Pre-Deployment**: Run all tests, code review, database migration testing
2. **Deployment**: Create backups, run migrations, deploy code, clear caches
3. **Post-Deployment**: Monitor logs, check performance, verify functionality

---

## 9. Testing Strategy

### 9.1 Unit Tests

- **Service Tests**: Test business logic in isolation
- **Repository Tests**: Test data access layer
- **Model Tests**: Test model relationships and scopes
- **Coverage**: Aim for 80%+ code coverage

### 9.2 Integration Tests

- **Workflow Tests**: Test complete workflows
- **API Tests**: Test API endpoints
- **Database Tests**: Test with real database
- **Transaction Tests**: Test transaction handling

### 9.3 Performance Tests

- **Load Testing**: Test with large datasets
- **Stress Testing**: Test system under stress
- **Benchmark Tests**: Measure performance metrics
- **Profiling**: Identify performance bottlenecks

---

## 10. Monitoring & Maintenance

### 10.1 Monitoring

- **Application Metrics**: Response times, error rates, throughput
- **Database Metrics**: Query performance, connection count, disk usage
- **System Metrics**: CPU, memory, disk I/O
- **Alerts**: Alert on anomalies and errors

### 10.2 Maintenance

- **Database Maintenance**: Vacuum, analyze, reindex
- **Log Rotation**: Rotate logs to prevent disk full
- **Backup Verification**: Verify backups are working
- **Security Updates**: Apply security patches

### 10.3 Troubleshooting

- **Error Logs**: Check application logs for errors
- **Database Logs**: Check database logs for issues
- **Performance Logs**: Check slow query logs
- **Audit Trail**: Review audit trail for suspicious activity

---

## 11. Technology Stack

### 11.1 Backend

- **Framework**: Laravel 11
- **Database**: PostgreSQL
- **ORM**: Eloquent
- **API**: RESTful with JSON responses
- **Authentication**: Sanctum (API tokens)
- **Caching**: Redis

### 11.2 Frontend

- **Framework**: React 18
- **Routing**: Inertia.js
- **Styling**: CSS with Tailwind CSS
- **State Management**: Context API + Inertia.js

### 11.3 Infrastructure

- **Deployment**: Docker containers
- **Database**: PostgreSQL with backups
- **Caching**: Redis for performance
- **Logging**: Structured logging with audit trail

---

## 12. Document References

This design consolidates information from:

1. **ARCHITECTURE_SUMMARY.md** - High-level architecture overview
2. **architecture-design.md** - Detailed system architecture
3. **detailed-implementation-guide.md** - Code-level implementation details
4. **frontend-architecture.md** - UI/Frontend architecture
5. **integration-workflows.md** - Integration patterns and workflows

---

## 13. Key Design Decisions

### 13.1 Database Design

- **Normalized Schema**: Separate tables for logs, records, violations, payroll, items
- **Immutable Audit Trail**: attendance_logs never modified after creation
- **Referential Integrity**: Foreign keys maintain data consistency
- **Performance Indexes**: Strategic indexes on frequently queried columns

### 13.2 Service Layer

- **Single Responsibility**: Each service handles one domain
- **Dependency Injection**: Services depend on repositories, not models
- **Transaction Management**: Database transactions ensure consistency
- **Error Handling**: Comprehensive validation and error recovery

### 13.3 API Design

- **RESTful Principles**: Standard HTTP methods and status codes
- **Consistent Response Format**: Standardized JSON responses
- **Error Handling**: Detailed error messages with error codes
- **Pagination**: Large datasets paginated for performance

### 13.4 Frontend Architecture

- **Component-Based**: Reusable components for maintainability
- **State Management**: Inertia.js for server-side state, Context API for client-side
- **Accessibility**: ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-friendly layouts

### 13.5 Integration Points

- **Attendance → Payroll**: Attendance metrics feed into payroll calculation
- **Violations → Payroll**: Violation deductions applied during payroll
- **Cash Advances → Payroll**: Advances deducted during payroll finalization
- **Audit Trail**: All significant actions logged for compliance

---

## 14. Correctness Properties

### 14.1 Attendance Processing

- **Property**: All attendance records for a date must have exactly one entry per employee
- **Property**: Confidence score must be between 0 and 100
- **Property**: Late minutes + undertime minutes + overtime minutes must be non-negative
- **Property**: Rendered hours must be between 0.0 and 1.0

### 14.2 Payroll Calculation

- **Property**: Basic pay = days worked × daily rate (must be non-negative)
- **Property**: Overtime pay = (overtime minutes ÷ 60) × hourly rate × 1.25 (must be non-negative)
- **Property**: Gross pay = basic pay + overtime pay (must be non-negative)
- **Property**: Net pay = gross pay - total deductions (must be non-negative)
- **Property**: Total deductions = sum of all deduction items (must be non-negative)

### 14.3 Cash Advance Integration

- **Property**: Cash advance amount must be positive
- **Property**: Cash advance can only be deducted once
- **Property**: Cash advance status transitions: Active → Applied → Completed
- **Property**: Deduction date must be within payroll period

### 14.4 Data Integrity

- **Property**: All payroll items must reference valid payroll record
- **Property**: All violations must reference valid attendance record
- **Property**: All attendance records must reference valid employee
- **Property**: Payroll period end date must be after start date

---

## 15. Conclusion

This comprehensive design provides a robust, scalable, and maintainable system for managing attendance and payroll. The architecture follows best practices for:

- **Data Integrity**: Normalized schema with referential integrity
- **Performance**: Optimized queries, caching, and batch processing
- **Security**: Authentication, authorization, and audit trails
- **Maintainability**: Clean separation of concerns, reusable components
- **Scalability**: Horizontal and vertical scaling capabilities
- **Reliability**: Error handling, transactions, and recovery mechanisms

The system is designed to handle complex attendance processing, accurate payroll calculation, and seamless cash advance integration while maintaining data integrity and system performance.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-15 | Initial comprehensive design document |

---

## Contact & Support

For questions or clarifications about this design:
- Review the detailed architecture documents
- Check the code examples in implementation guide
- Refer to the integration workflows
- Consult the frontend architecture guide
