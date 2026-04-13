# Payroll Generation Wizard - Feature Specification

## Overview

Transform the payroll generation process into a guided multi-step wizard that ensures data accuracy and compliance before finalizing payroll. Users will progress through distinct stages, with the ability to review and correct data at each step.

---

## Current Flow vs. New Flow

### Current Flow (Simple)
```
Attendance Records → Generate Payroll → Done
```

### New Flow (Wizard-Based)
```
Step 1: SELECT PERIOD
  ↓
Step 2: VALIDATE ATTENDANCE
  ↓
Step 3: REVIEW PAYROLL
  ↓
Step 4: CONFIRM & FINALIZE
  ↓
Step 5: PRINT/EXPORT
```

---

## Step-by-Step Breakdown

### Step 1: SELECT PERIOD
**Purpose**: Choose the payroll period and date range

**UI Elements**:
- Period selector (dropdown or calendar range picker)
- Display: Start date, End date, Number of days
- Show: Number of employees to be processed
- Show: Attendance data status (complete/incomplete)
- Button: "Next" (enabled only if valid period selected)
- Button: "Cancel"

**Validations**:
- Period must have complete attendance data
- Cannot generate payroll for overlapping periods
- Must have at least 1 day of data

**Data to Collect**:
- `payroll_period_id` or date range
- Number of employees affected

---

### Step 2: VALIDATE ATTENDANCE
**Purpose**: Check attendance records for issues before processing

**UI Elements**:
- Progress indicator showing validation status
- List of validation checks:
  - ✓ All employees have records
  - ✓ No missing critical times
  - ✓ All rendered hours valid (0-1)
  - ✓ No conflicting records
  - ✓ All statuses valid
  
- If issues found:
  - Show list of problematic records
  - Display: Employee name, Date, Issue type, Message
  - Button: "Fix Issues" (links back to Attendance Records page)
  - Button: "Continue Anyway" (if issues are non-critical)
  
- If no issues:
  - Show success message
  - Button: "Next"

**Validations**:
- Call `POST /api/attendance/validate-for-payroll`
- Check for missing times, invalid rendered hours, etc.

**Data to Collect**:
- Validation results
- User decision (fix or continue)

---

### Step 3: REVIEW PAYROLL
**Purpose**: Preview calculated payroll before finalization

**UI Elements**:
- Summary statistics:
  - Total employees
  - Total gross pay
  - Total deductions
  - Total net pay
  
- Detailed table showing:
  - Employee name & ID
  - Basic salary
  - Allowances
  - Deductions
  - Gross pay
  - Net pay
  - Action: "View Details" (expand row)
  
- Expandable row details:
  - Attendance summary (days worked, absences, lates)
  - Breakdown of deductions
  - Contributions
  - Cash advances applied
  
- Buttons:
  - "Edit" (go back to Step 2 to fix attendance)
  - "Next" (proceed to confirmation)
  - "Cancel"

**Data to Collect**:
- User confirmation of payroll amounts
- Any notes or adjustments

---

### Step 4: CONFIRM & FINALIZE
**Purpose**: Final confirmation before saving payroll to database

**UI Elements**:
- Summary of payroll period
- Checklist of confirmations:
  - ☐ I have reviewed all payroll amounts
  - ☐ Attendance data is accurate
  - ☐ All deductions are correct
  - ☐ I authorize this payroll to be finalized
  
- Display:
  - Total employees
  - Total gross pay
  - Total net pay
  - Period dates
  
- Buttons:
  - "Back" (go to Step 3)
  - "Finalize Payroll" (disabled until all checkboxes checked)
  - "Cancel"

**Validations**:
- All checkboxes must be checked
- User must confirm authorization

**Data to Collect**:
- Finalization timestamp
- User who finalized
- Confirmation checkboxes

---

### Step 5: PRINT/EXPORT
**Purpose**: Generate payslips and export payroll data

**UI Elements**:
- Success message: "Payroll finalized successfully!"
- Display: Payroll ID, Period, Finalization date/time
- Options:
  - "Print Payslips" (generates PDF for all employees)
  - "Export to Excel" (exports payroll data)
  - "View Payroll Details" (links to Payroll menu)
  - "Generate New Payroll" (restart wizard)
  - "Back to Dashboard"

**Actions**:
- Generate payslips for all employees
- Create payroll records in database
- Update payroll period status to "Finalized"
- Log payroll generation event

---

## UI/UX Design

### Progress Indicator
```
┌─────────────────────────────────────────────────────────┐
│ Step 1: SELECT PERIOD  →  Step 2: VALIDATE  →  Step 3: REVIEW  →  Step 4: CONFIRM  →  Step 5: PRINT │
│ ✓ Complete            ✓ Complete           ✓ Complete        ✓ Complete         ⏳ Current
└─────────────────────────────────────────────────────────┘
```

### Color Scheme
- **Completed**: Green checkmark
- **Current**: Blue highlight
- **Pending**: Gray
- **Error**: Red warning

### Navigation
- "Next" button moves forward
- "Back" button moves backward (preserves data)
- "Cancel" exits wizard (with confirmation)
- Progress bar shows completion percentage

---

## Database Changes Required

### New Table: `payroll_generation_sessions`
```sql
CREATE TABLE payroll_generation_sessions (
    id BIGINT PRIMARY KEY,
    payroll_period_id BIGINT,
    started_by BIGINT (user_id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    status ENUM('in_progress', 'completed', 'cancelled'),
    validation_results JSON,
    payroll_data JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Update: `payroll_periods` table
```sql
ALTER TABLE payroll_periods ADD COLUMN status ENUM('draft', 'finalized', 'locked') DEFAULT 'draft';
ALTER TABLE payroll_periods ADD COLUMN finalized_by BIGINT;
ALTER TABLE payroll_periods ADD COLUMN finalized_at TIMESTAMP;
```

---

## API Endpoints Required

### 1. Get Payroll Periods
```
GET /api/payroll/periods
Response: [{ id, name, start_date, end_date, status, employee_count }]
```

### 2. Validate Attendance for Period
```
POST /api/attendance/validate-for-payroll
Request: { payroll_period_id }
Response: { valid, issues: [...] }
```

### 3. Calculate Payroll Preview
```
POST /api/payroll/calculate-preview
Request: { payroll_period_id }
Response: { 
    summary: { total_employees, total_gross, total_deductions, total_net },
    employees: [{ id, name, gross, deductions, net, ... }]
}
```

### 4. Finalize Payroll
```
POST /api/payroll/finalize
Request: { payroll_period_id, confirmed: true }
Response: { success, payroll_id, message }
```

### 5. Generate Payslips
```
POST /api/payroll/{payroll_id}/generate-payslips
Response: { success, pdf_url, message }
```

---

## Frontend Components

### New Components
1. **PayrollWizard.jsx** - Main wizard container
2. **Step1SelectPeriod.jsx** - Period selection
3. **Step2ValidateAttendance.jsx** - Validation display
4. **Step3ReviewPayroll.jsx** - Payroll preview
5. **Step4ConfirmFinalize.jsx** - Confirmation
6. **Step5PrintExport.jsx** - Print/export options
7. **PayrollProgressBar.jsx** - Progress indicator
8. **PayrollSummary.jsx** - Summary display

### Updated Components
1. **Attendance/Records.jsx** - Add "Generate Payroll" button
2. **Payroll/Index.jsx** - Link to wizard, show finalized payrolls
3. **Payroll/Period.jsx** - Show period status

---

## User Workflow

### Scenario: Generate Payroll for April 2026

```
1. Admin goes to Attendance Records
2. Uploads attendance CSV for April 1-30
3. Searches for April date range
4. Clicks "Generate Payroll" button
5. Wizard opens - Step 1: SELECT PERIOD
   - Selects "April 2026" period
   - Sees 22 employees will be processed
   - Clicks "Next"
6. Step 2: VALIDATE ATTENDANCE
   - System checks all records
   - Finds 2 employees with missing times
   - Shows warning but allows continue
   - Admin clicks "Continue Anyway"
7. Step 3: REVIEW PAYROLL
   - Sees payroll summary
   - Reviews individual employee amounts
   - Expands one employee to see breakdown
   - Satisfied with amounts
   - Clicks "Next"
8. Step 4: CONFIRM & FINALIZE
   - Checks all confirmation boxes
   - Clicks "Finalize Payroll"
9. Step 5: PRINT/EXPORT
   - Sees success message
   - Clicks "Print Payslips"
   - PDF generated with all payslips
   - Can export to Excel
   - Clicks "View Payroll Details" to see in Payroll menu
```

---

## Benefits

✅ **Data Accuracy**: Multiple validation checkpoints
✅ **User Confidence**: Clear preview before finalization
✅ **Audit Trail**: Session tracking and timestamps
✅ **Error Prevention**: Validation catches issues early
✅ **Professional UX**: Guided, step-by-step process
✅ **Flexibility**: Can go back and fix issues
✅ **Compliance**: Confirmation checkboxes for authorization
✅ **Reporting**: Easy access to payslips and exports

---

## Implementation Phases

### Phase 1: Backend
- [ ] Create database tables
- [ ] Implement API endpoints
- [ ] Add validation logic
- [ ] Add payroll calculation logic

### Phase 2: Frontend - Wizard UI
- [ ] Create wizard container
- [ ] Implement Step 1-5 components
- [ ] Add progress indicator
- [ ] Add navigation logic

### Phase 3: Integration
- [ ] Add "Generate Payroll" button to Attendance Records
- [ ] Update Payroll menu to show finalized payrolls
- [ ] Add payslip generation
- [ ] Add export functionality

### Phase 4: Testing & Polish
- [ ] Test all validation scenarios
- [ ] Test navigation (forward/backward)
- [ ] Test data persistence
- [ ] Polish UI/UX

---

## Success Criteria

✅ Users can generate payroll through guided wizard
✅ All validation checks work correctly
✅ Payroll preview shows accurate calculations
✅ Finalization creates payroll records
✅ Payslips can be printed/exported
✅ Payroll menu shows finalized payrolls
✅ No data loss when navigating wizard
✅ Audit trail tracks all actions

