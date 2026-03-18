# Cash Advances Integration Audit

## Current Status

### ✅ What Still Exists (Not Removed)
1. **Database**: Cash advances table likely still exists in database
2. **Models**: CashAdvance model may still exist
3. **Controllers**: CashAdvanceController may still exist
4. **Services**: CashAdvanceService may still exist
5. **Compiled Assets**: Old build still has cash advances UI (showing in browser)

### ❌ What Was Removed
1. **Routes** (routes/web.php):
   - Removed CashAdvanceController import
   - Removed all cash advances routes:
     - POST `/cash-advances`
     - POST `/cash-advances/{cashAdvance}/approve`
     - POST `/cash-advances/{cashAdvance}/cancel`
     - DELETE `/cash-advances/{cashAdvance}`

2. **API Routes** (routes/api.php):
   - Removed CashAdvanceController import
   - Removed all cash advances API endpoints:
     - GET `/cash-advances/employee/{employeeId}`
     - GET `/cash-advances/period/{periodId}`
     - GET `/cash-advances/pending`

3. **PayrollService** (app/Services/PayrollService.php):
   - Removed cash advances deduction logic from `calculatePayroll()` method
   - Removed cash advances logging/debugging code
   - Removed cash advance amount calculations

4. **Employee Model** (app/Models/Employee.php):
   - Removed `cashAdvances()` relationship method

5. **Frontend Components**:
   - Removed PayrollCashAdvances component import from Period.jsx
   - Removed PayrollCashAdvances component rendering from Period.jsx
   - Removed CashAdvancesTab component import from Employees/Index.jsx
   - Removed CashAdvancesTab tab button from Employees/Index.jsx
   - Removed CashAdvancesTab content rendering from Employees/Index.jsx

6. **Payslip** (resources/js/Pages/Payroll/Payslip.jsx):
   - Removed cash advances filtering logic
   - Removed cash advances info banner
   - Removed cash advances table rows rendering

## What Needs to Be Re-Integrated

### 1. Database & Models
- [ ] Verify CashAdvance model exists: `app/Models/CashAdvance.php`
- [ ] Verify cash_advances table migration exists
- [ ] Verify PayrollPeriod model has `cashAdvances()` relationship
- [ ] Verify Payroll model has `cashAdvances()` relationship

### 2. Backend - Routes
- [ ] Add CashAdvanceController import to `routes/web.php`
- [ ] Add cash advances routes to `routes/web.php`:
  ```php
  Route::post('/cash-advances', [CashAdvanceController::class, 'store'])->name('admin.cash-advances.store');
  Route::post('/cash-advances/{cashAdvance}/approve', [CashAdvanceController::class, 'approve'])->name('admin.cash-advances.approve');
  Route::post('/cash-advances/{cashAdvance}/cancel', [CashAdvanceController::class, 'cancel'])->name('admin.cash-advances.cancel');
  Route::delete('/cash-advances/{cashAdvance}', [CashAdvanceController::class, 'destroy'])->name('admin.cash-advances.destroy');
  ```
- [ ] Add CashAdvanceController import to `routes/api.php`
- [ ] Add cash advances API routes to `routes/api.php`:
  ```php
  Route::get('cash-advances/employee/{employeeId}', [CashAdvanceController::class, 'getEmployeeCashAdvances'])->name('api.cash-advances.employee');
  Route::get('cash-advances/period/{periodId}', [CashAdvanceController::class, 'getPeriodCashAdvances'])->name('api.cash-advances.period');
  Route::get('cash-advances/pending', [CashAdvanceController::class, 'getPendingCashAdvances'])->name('api.cash-advances.pending');
  ```

### 3. Backend - Services
- [ ] Verify CashAdvanceService exists: `app/Services/CashAdvanceService.php`
- [ ] Add cash advances deduction logic back to PayrollService.calculatePayroll():
  ```php
  // Add cash advances deductions
  $cashAdvances = $employee->cashAdvances()
      ->where('status', 'approved')
      ->whereNull('payroll_period_id')
      ->get();
  
  foreach ($cashAdvances as $cashAdvance) {
      $deductions[] = [
          'category' => 'Cash Advance',
          'amount' => (float) $cashAdvance->amount,
          'reference_id' => $cashAdvance->id,
      ];
  }
  ```

### 4. Backend - Models
- [ ] Add `cashAdvances()` relationship back to Employee model:
  ```php
  public function cashAdvances()
  {
      return $this->hasMany(CashAdvance::class);
  }
  ```

### 5. Frontend - Components
- [ ] Create/restore PayrollCashAdvances component: `resources/js/Components/PayrollCashAdvances.jsx`
- [ ] Create/restore CashAdvancesTab component: `resources/js/Components/CashAdvancesTab.jsx`

### 6. Frontend - Pages
- [ ] Add PayrollCashAdvances import to `resources/js/Pages/Payroll/Period.jsx`
- [ ] Add PayrollCashAdvances rendering to Period.jsx (in appropriate tab or section)
- [ ] Add CashAdvancesTab import to `resources/js/Pages/Employees/Index.jsx`
- [ ] Add CashAdvancesTab button to Employees/Index.jsx
- [ ] Add CashAdvancesTab content rendering to Employees/Index.jsx

### 7. Frontend - Payslip
- [ ] Add cash advances filtering logic back to Payslip.jsx:
  ```jsx
  const cashAdvances = deductions.filter(item => item.category === 'Cash Advance');
  ```
- [ ] Add cash advances rendering in payslip table

## Integration Strategy

**Recommended Approach:**
1. First, check if backend files (models, controllers, services) still exist
2. If they exist, just re-add the routes
3. Then re-add the frontend components and imports
4. Finally, rebuild the frontend assets

**If backend files don't exist:**
1. Restore from git history or recreate them
2. Follow the same integration steps

## Audit Results

### ❌ Backend Files Status
- `app/Models/CashAdvance.php` - **DOES NOT EXIST** (was deleted)
- `app/Http/Controllers/CashAdvanceController.php` - **DOES NOT EXIST** (was deleted)
- `app/Services/CashAdvanceService.php` - **DOES NOT EXIST** (was deleted)
- Database migrations - **UNKNOWN** (need to check)

## Conclusion

**All backend cash advances code has been completely removed.** To re-integrate cash advances, we need to:

1. **Recreate all backend files** from scratch or restore from git history
2. **Re-add routes** to web.php and api.php
3. **Re-add PayrollService logic** for cash advances deductions
4. **Re-add Employee model relationship**
5. **Recreate frontend components** (PayrollCashAdvances, CashAdvancesTab)
6. **Re-add frontend imports and rendering**
7. **Rebuild frontend assets**

## Recommendation

Before proceeding with re-integration, I recommend:

1. **Check git history** to see if we can restore the deleted files
2. **Or create a spec** to properly design and implement cash advances from scratch
3. **Or provide the original cash advances code** if you have it saved

Would you like me to:
- [ ] Create a spec for cash advances integration?
- [ ] Restore from git history (if available)?
- [ ] Recreate cash advances from scratch based on the previous implementation?
