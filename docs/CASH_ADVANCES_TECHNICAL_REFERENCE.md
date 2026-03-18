# Cash Advances - Technical Reference

## Architecture

### Database Schema
```
cash_advances table:
- id (primary key)
- employee_id (foreign key → employees)
- amount (decimal)
- reason (text, nullable)
- status (enum: Active, Deducted, Completed)
- created_by (foreign key → users)
- deducted_at (timestamp, nullable)
- payroll_period_id (foreign key → payroll_periods, nullable)
- created_at, updated_at (timestamps)
```

### Models

#### CashAdvance Model
Location: `app/Models/CashAdvance.php`

**Relationships**:
- `employee()` - BelongsTo Employee
- `createdBy()` - BelongsTo User
- `payrollPeriod()` - BelongsTo PayrollPeriod

**Scopes**:
- `active()` - Filter by status = 'Active'
- `deducted()` - Filter by status = 'Deducted'
- `completed()` - Filter by status = 'Completed'
- `byEmployee($id)` - Filter by employee_id
- `byStatus($status)` - Filter by status
- `byDateRange($start, $end)` - Filter by date range

**Methods**:
- `isDeductible()` - Check if can be deducted
- `getRemainingBalance()` - Get remaining amount

#### Employee Model
Location: `app/Models/Employee.php`

**New Relationship**:
```php
public function cashAdvances()
{
    return $this->hasMany(CashAdvance::class);
}
```

### Services

#### CashAdvanceService
Location: `app/Services/CashAdvanceService.php`

**Methods**:

1. **createAdvance(Employee $employee, array $data, User $admin): CashAdvance**
   - Creates a new cash advance
   - Validates amount > 0
   - Sets status to 'Active'
   - Records admin who created it

2. **deleteAdvance(CashAdvance $advance): void**
   - Deletes a cash advance
   - Only allows deletion if status is 'Active'
   - Throws exception if already deducted

3. **applyDeduction(CashAdvance $advance, Payroll $payroll): PayrollItem**
   - Creates a deduction item in payroll
   - Updates advance status to 'Deducted'
   - Records deduction date and payroll period
   - Recalculates payroll totals

4. **getDeductibleAdvances(Employee $employee): Collection**
   - Returns all active advances for employee
   - Ordered by creation date

5. **getRemainingAdvances(Employee $employee): Collection**
   - Returns all active and deducted advances
   - Shows unpaid balance

6. **getTotalRemainingBalance(Employee $employee): float**
   - Calculates total unpaid amount
   - Includes both active and deducted advances

7. **recalculatePayrollTotals(Payroll $payroll): void**
   - Updates payroll totals after deduction
   - Recalculates: total_earnings, total_deductions, net_pay

### Controllers

#### PayrollController
Location: `app/Http/Controllers/PayrollController.php`

**New Methods**:

1. **getEmployeeCashAdvances(Employee $employee): JsonResponse**
   - Returns cash advances for an employee
   - Response format:
   ```json
   {
       "deductible": [...],
       "remaining": [...],
       "totalRemaining": 0.00
   }
   ```

2. **addCashAdvance(Request $request, Employee $employee)**
   - Validates: amount (required, numeric, min 0.01), reason (nullable, string, max 500)
   - Creates advance via service
   - Returns 201 on success, 400 on error

3. **removeCashAdvance(CashAdvance $advance)**
   - Deletes advance via service
   - Returns 200 on success, 403 on error

4. **applyCashAdvanceDeduction(Request $request, Payroll $payroll): JsonResponse**
   - Applies deduction to payroll
   - Validates: cash_advance_id (required, exists)
   - Returns 200 on success, 400 on error

### API Routes

Location: `routes/api.php`

```php
// Get cash advances for employee
GET /api/employees/{employee}/cash-advances

// Add cash advance
POST /api/employees/{employee}/cash-advances
Body: { "amount": 1000, "reason": "Emergency" }

// Remove cash advance
DELETE /api/cash-advances/{cashAdvance}

// Apply deduction to payroll
POST /api/payroll/{payroll}/apply-cash-advance
Body: { "cash_advance_id": 1 }
```

All routes require:
- Authentication (`auth` middleware)
- Email verification (`verified` middleware)
- CSRF token in header: `X-CSRF-TOKEN`

### Frontend Components

#### Period.jsx
Location: `resources/js/Pages/Payroll/Period.jsx`

**State**:
- `cashAdvances` - Object mapping employee_id to cash advance data
- `newAdvance` - Form state for adding new advance
- `successMessage` - Success notification
- `errorMessage` - Error notification

**Methods**:
- `fetchCashAdvances()` - Fetches advances for all employees in period
- `handleAddCashAdvance()` - Adds new advance
- `handleApplyDeduction()` - Applies deduction to payroll
- `handleRemoveAdvance()` - Removes advance

**UI Sections**:
- **Add Cash Advance Form** - Employee dropdown, amount input, reason input
- **Cash Advances Table** - Shows available and remaining advances per employee

#### Payslip.jsx
Location: `resources/js/Pages/Payroll/Payslip.jsx`

**Displays**:
- Cash advance deductions in deductions section
- Remaining balance note at bottom of payslip

## Data Flow

### Adding a Cash Advance
```
User fills form
    ↓
handleAddCashAdvance() validates input
    ↓
POST /api/employees/{id}/cash-advances
    ↓
PayrollController::addCashAdvance()
    ↓
CashAdvanceService::createAdvance()
    ↓
CashAdvance model created with status='Active'
    ↓
Response returned to frontend
    ↓
fetchCashAdvances() refreshes data
    ↓
UI updated with new advance
```

### Applying a Deduction
```
User clicks "Apply" button
    ↓
handleApplyDeduction() sends request
    ↓
POST /api/payroll/{id}/apply-cash-advance
    ↓
PayrollController::applyCashAdvanceDeduction()
    ↓
CashAdvanceService::applyDeduction()
    ↓
PayrollItem created (type=DEDUCTION, category=Cash Advance)
    ↓
CashAdvance status updated to 'Deducted'
    ↓
Payroll totals recalculated
    ↓
Response returned to frontend
    ↓
fetchCashAdvances() refreshes data
    ↓
UI updated - advance moves to "Remaining" column
```

## Error Handling

### Validation Errors
- Amount must be numeric and > 0
- Employee must exist
- Reason must be string if provided

### Business Logic Errors
- Cannot delete deducted advance
- Cannot apply already deducted advance
- Employee must exist in payroll period

### HTTP Status Codes
- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Validation or business logic error
- 403 Forbidden - Permission denied
- 404 Not Found - Resource not found
- 419 Token Mismatch - CSRF token invalid

## Testing

### Unit Tests
Location: `tests/Unit/CashAdvanceServiceTest.php`

Tests for:
- Creating advances
- Deleting advances
- Applying deductions
- Calculating balances

### Feature Tests
Location: `tests/Feature/CashAdvancePayrollTest.php`
Location: `tests/Feature/CashAdvancePayslipTest.php`

Tests for:
- API endpoints
- Payroll integration
- Payslip display

## Performance Considerations

1. **Database Queries**
   - Use eager loading for relationships
   - Index on employee_id and status for filtering

2. **Caching**
   - Consider caching total remaining balance
   - Invalidate on advance creation/deletion

3. **Batch Operations**
   - Apply multiple deductions in single request
   - Recalculate payroll once after all deductions

## Security

1. **Authentication**
   - All routes require authentication
   - Email verification required

2. **Authorization**
   - Only admins can manage cash advances
   - Consider adding role-based access control

3. **CSRF Protection**
   - All POST/DELETE requests require CSRF token
   - Token sent in X-CSRF-TOKEN header

4. **Input Validation**
   - All inputs validated on server side
   - Amount validated as positive number
   - Reason limited to 500 characters

## Future Enhancements

1. **Partial Deductions**
   - Allow deducting only part of advance
   - Track remaining balance per advance

2. **Interest Calculation**
   - Add interest on advances
   - Calculate based on duration

3. **Approval Workflow**
   - Require approval before creating advance
   - Track approval history

4. **Reporting**
   - Generate cash advance reports
   - Track deduction history per employee

5. **Bulk Operations**
   - Import advances from CSV
   - Bulk apply deductions
