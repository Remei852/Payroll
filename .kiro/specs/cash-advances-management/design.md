# Cash Advances Integration - Technical Design Document

## Overview

The Cash Advances Integration feature seamlessly integrates cash advance management into the existing payroll generation workflow. Rather than a standalone feature, cash advances are managed directly within the payroll generation page, allowing admins to add and apply deductions to employee payslips in a single, streamlined operation. This keeps the entire payroll cycle smooth and efficient.

### Key Design Principles

1. **Workflow Integration**: Cash advances are managed within the payroll generation page, not separately
2. **Simplicity**: Straightforward admin-driven workflow with minimal steps
3. **Auditability**: Complete tracking of all advances and deductions
4. **Accuracy**: Automatic recalculation of payroll totals when deductions are applied
5. **Clarity**: Clear display of deductions and remaining balances on printed payslips

---

## Database Schema

### Tables

#### 1. cash_advances
Stores all cash advances granted to employees.

```sql
CREATE TABLE cash_advances (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_id BIGINT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NULL,
  status ENUM('Active', 'Deducted', 'Completed') DEFAULT 'Active',
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deducted_at TIMESTAMP NULL,
  payroll_period_id BIGINT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id),
  INDEX idx_employee_status (employee_id, status),
  INDEX idx_created_at (created_at)
);
```

**Fields:**
- `employee_id`: Employee receiving the advance
- `amount`: Advance amount
- `reason`: Optional reason for the advance
- `status`: Current state (Active, Deducted, Completed)
- `created_by`: Admin who created the advance
- `payroll_period_id`: Period when deduction was applied
- `deducted_at`: Timestamp when deduction was applied

### Relationships

```
Employee (1) ──→ (Many) CashAdvance
CashAdvance ──→ PayrollPeriod (when deducted)
CashAdvance ──→ User (created_by)
CashAdvance ──→ PayrollItem (deduction records)
```

---

## Models

### CashAdvance Model

```php
namespace App\Models;

class CashAdvance extends Model
{
    protected $fillable = [
        'employee_id',
        'amount',
        'reason',
        'status',
        'created_by',
        'deducted_at',
        'payroll_period_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'deducted_at' => 'datetime',
    ];

    // Relationships
    public function employee() { return $this->belongsTo(Employee::class); }
    public function createdBy() { return $this->belongsTo(User::class, 'created_by'); }
    public function payrollPeriod() { return $this->belongsTo(PayrollPeriod::class); }

    // Scopes
    public function scopeActive($query) { return $query->where('status', 'Active'); }
    public function scopeDeducted($query) { return $query->where('status', 'Deducted'); }
    public function scopeCompleted($query) { return $query->where('status', 'Completed'); }
    public function scopeByEmployee($query, $employeeId) { return $query->where('employee_id', $employeeId); }
    public function scopeByStatus($query, $status) { return $query->where('status', $status); }
    public function scopeByDateRange($query, $startDate, $endDate) { 
        return $query->whereBetween('created_at', [$startDate, $endDate]); 
    }

    // Helper methods
    public function isDeductible() { return $this->status === 'Active'; }
    public function getRemainingBalance() { return $this->amount; }
}
```

---

## Services

### CashAdvanceService

Handles all business logic for cash advance operations.

```php
namespace App\Services;

class CashAdvanceService
{
    /**
     * Create a new cash advance for an employee
     */
    public function createAdvance(Employee $employee, array $data, User $admin): CashAdvance
    {
        if ($data['amount'] <= 0) {
            throw new \Exception('Amount must be a positive number');
        }

        $advance = $employee->cashAdvances()->create([
            'amount' => $data['amount'],
            'reason' => $data['reason'] ?? null,
            'status' => 'Active',
            'created_by' => $admin->id,
        ]);

        return $advance;
    }

    /**
     * Delete a cash advance (only if not yet deducted)
     */
    public function deleteAdvance(CashAdvance $advance): void
    {
        if ($advance->status !== 'Active') {
            throw new \Exception('Cannot delete an advance that has been deducted');
        }

        $advance->delete();
    }

    /**
     * Apply deduction to payroll
     */
    public function applyDeduction(CashAdvance $advance, Payroll $payroll): PayrollItem
    {
        if ($advance->status !== 'Active') {
            throw new \Exception('Only active advances can be deducted');
        }

        // Create deduction item
        $item = PayrollItem::create([
            'payroll_id' => $payroll->id,
            'type' => 'DEDUCTION',
            'category' => 'Cash Advance',
            'amount' => $advance->amount,
            'reference_id' => $advance->id,
        ]);

        // Update advance status
        $advance->update([
            'status' => 'Deducted',
            'deducted_at' => now(),
            'payroll_period_id' => $payroll->payroll_period_id,
        ]);

        // Recalculate payroll totals
        $this->recalculatePayrollTotals($payroll);

        return $item;
    }

    /**
     * Get active deductible advances for employee
     */
    public function getDeductibleAdvances(Employee $employee): Collection
    {
        return $employee->cashAdvances()
            ->active()
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Get remaining unpaid advances for employee
     */
    public function getRemainingAdvances(Employee $employee): Collection
    {
        return $employee->cashAdvances()
            ->whereIn('status', ['Active', 'Deducted'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Calculate total remaining balance for employee
     */
    public function getTotalRemainingBalance(Employee $employee): float
    {
        return $employee->cashAdvances()
            ->whereIn('status', ['Active', 'Deducted'])
            ->sum('amount');
    }

    private function recalculatePayrollTotals(Payroll $payroll): void
    {
        $earnings = $payroll->earnings()->sum('amount');
        $deductions = $payroll->deductions()->sum('amount');
        
        $payroll->update([
            'total_earnings' => $earnings,
            'total_deductions' => $deductions,
            'net_pay' => $earnings - $deductions,
        ]);
    }
}
```

---

## Controllers

### PayrollController (Enhanced)

The existing PayrollController is enhanced to include cash advance management.

```php
namespace App\Http\Controllers;

class PayrollController extends Controller
{
    protected PayrollService $payrollService;
    protected CashAdvanceService $cashAdvanceService;

    public function __construct(PayrollService $payrollService, CashAdvanceService $cashAdvanceService)
    {
        $this->payrollService = $payrollService;
        $this->cashAdvanceService = $cashAdvanceService;
    }

    /**
     * Show payroll generation page with cash advances section
     */
    public function generate(Request $request): Response
    {
        $payrollPeriod = PayrollPeriod::findOrFail($request->payroll_period_id);
        $employees = Employee::all();

        return Inertia::render('Payroll/Generate', [
            'payrollPeriod' => $payrollPeriod,
            'employees' => $employees,
        ]);
    }

    /**
     * Get cash advances for selected employee
     */
    public function getEmployeeCashAdvances(Employee $employee): JsonResponse
    {
        $deductible = $this->cashAdvanceService->getDeductibleAdvances($employee);
        $remaining = $this->cashAdvanceService->getRemainingAdvances($employee);
        $totalRemaining = $this->cashAdvanceService->getTotalRemainingBalance($employee);

        return response()->json([
            'deductible' => $deductible,
            'remaining' => $remaining,
            'totalRemaining' => $totalRemaining,
        ]);
    }

    /**
     * Add cash advance to employee
     */
    public function addCashAdvance(Request $request, Employee $employee): RedirectResponse
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->cashAdvanceService->createAdvance($employee, $request->validated(), auth()->user());
            return redirect()->back()->with('success', 'Cash advance added successfully');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Remove cash advance from employee
     */
    public function removeCashAdvance(CashAdvance $advance): RedirectResponse
    {
        try {
            $this->cashAdvanceService->deleteAdvance($advance);
            return redirect()->back()->with('success', 'Cash advance removed successfully');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Apply cash advance deduction to payroll
     */
    public function applyCashAdvanceDeduction(Request $request, Payroll $payroll): JsonResponse
    {
        $request->validate([
            'cash_advance_id' => ['required', 'exists:cash_advances,id'],
        ]);

        try {
            $advance = CashAdvance::findOrFail($request->cash_advance_id);
            $this->cashAdvanceService->applyDeduction($advance, $payroll);
            return response()->json(['success' => true, 'message' => 'Deduction applied successfully']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
```

---

## Frontend Components

### Payroll/Generate.jsx (Enhanced)

The payroll generation page includes a cash advances section.

```jsx
export default function Generate({ payrollPeriod, employees }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [cashAdvances, setCashAdvances] = useState({
    deductible: [],
    remaining: [],
    totalRemaining: 0,
  });
  const [newAdvance, setNewAdvance] = useState({ amount: '', reason: '' });

  const handleEmployeeSelect = async (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee);
    
    // Fetch cash advances for employee
    const response = await axios.get(`/api/employees/${employeeId}/cash-advances`);
    setCashAdvances(response.data);
  };

  const handleAddAdvance = async () => {
    if (!newAdvance.amount || !selectedEmployee) return;
    
    try {
      await axios.post(`/api/employees/${selectedEmployee.id}/cash-advances`, newAdvance);
      setNewAdvance({ amount: '', reason: '' });
      handleEmployeeSelect(selectedEmployee.id); // Refresh
    } catch (error) {
      alert('Error adding cash advance: ' + error.response.data.message);
    }
  };

  const handleApplyDeduction = async (advanceId) => {
    try {
      await axios.post(`/api/payroll/${payrollPeriod.id}/apply-cash-advance`, {
        cash_advance_id: advanceId,
      });
      handleEmployeeSelect(selectedEmployee.id); // Refresh
    } catch (error) {
      alert('Error applying deduction: ' + error.response.data.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1>Generate Payroll - {payrollPeriod.name}</h1>

      {/* Employee Selection */}
      <div>
        <label>Select Employee</label>
        <select onChange={(e) => handleEmployeeSelect(e.target.value)}>
          <option value="">-- Select Employee --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>

      {selectedEmployee && (
        <div className="space-y-6">
          {/* Cash Advances Section */}
          <div className="border p-4 rounded">
            <h2>Cash Advances</h2>

            {/* Add New Advance */}
            <div className="space-y-3 mb-6">
              <h3>Add Cash Advance</h3>
              <input
                type="number"
                placeholder="Amount"
                value={newAdvance.amount}
                onChange={(e) => setNewAdvance({...newAdvance, amount: e.target.value})}
              />
              <textarea
                placeholder="Reason (optional)"
                value={newAdvance.reason}
                onChange={(e) => setNewAdvance({...newAdvance, reason: e.target.value})}
              />
              <button onClick={handleAddAdvance}>Add Advance</button>
            </div>

            {/* Deductible Advances */}
            {cashAdvances.deductible.length > 0 && (
              <div className="mb-6">
                <h3>Available to Deduct</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Date Added</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashAdvances.deductible.map(adv => (
                      <tr key={adv.id}>
                        <td>{adv.amount}</td>
                        <td>{adv.reason || '-'}</td>
                        <td>{new Date(adv.created_at).toLocaleDateString()}</td>
                        <td>
                          <button onClick={() => handleApplyDeduction(adv.id)}>
                            Apply Deduction
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Remaining Balance */}
            {cashAdvances.totalRemaining > 0 && (
              <div className="bg-yellow-50 p-3 rounded">
                <strong>Total Remaining Balance: {cashAdvances.totalRemaining}</strong>
              </div>
            )}
          </div>

          {/* Rest of payroll generation form */}
          {/* ... existing payroll fields ... */}
        </div>
      )}
    </div>
  );
}
```

---

## Payslip Display

### Payslip.jsx (Enhanced)

The payslip component displays cash advance deductions and remaining balance.

```jsx
export default function Payslip({ payslip }) {
  const cashAdvanceDeductions = payslip.items.filter(
    item => item.category === 'Cash Advance'
  );
  
  const totalCashAdvanceDeductions = cashAdvanceDeductions.reduce(
    (sum, item) => sum + parseFloat(item.amount), 0
  );

  return (
    <div className="payslip">
      {/* ... existing payslip content ... */}

      {/* Deductions Section */}
      <section className="deductions">
        <h3>Deductions</h3>
        <table>
          <tbody>
            {payslip.items.filter(item => item.type === 'DEDUCTION').map(item => (
              <tr key={item.id}>
                <td>{item.category}</td>
                <td className="amount">{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Cash Advances Note */}
      {(cashAdvanceDeductions.length > 0 || payslip.remainingCashAdvanceBalance > 0) && (
        <section className="cash-advances-note">
          <h4>Cash Advances</h4>
          {cashAdvanceDeductions.length > 0 && (
            <p>Deducted this period: {totalCashAdvanceDeductions}</p>
          )}
          {payslip.remainingCashAdvanceBalance > 0 && (
            <p>Remaining balance: {payslip.remainingCashAdvanceBalance}</p>
          )}
        </section>
      )}

      {/* ... rest of payslip ... */}
    </div>
  );
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees/{id}/cash-advances` | Get cash advances for employee |
| POST | `/api/employees/{id}/cash-advances` | Add cash advance to employee |
| DELETE | `/api/cash-advances/{id}` | Delete cash advance |
| POST | `/api/payroll/{id}/apply-cash-advance` | Apply deduction to payroll |

---

## Workflow

### Cash Advance Application During Payroll Generation

```
1. Admin opens Payroll Generation page
2. Admin selects Employee
3. System displays:
   - Active cash advances (deductible)
   - Form to add new advance
   - Remaining balance
4. Admin can:
   - Add new advance
   - Apply deduction from existing advance
   - Remove advance (if not yet deducted)
5. When deduction applied:
   - PayrollItem created
   - CashAdvance status updated to "Deducted"
   - Payroll totals recalculated
6. Admin continues with payroll generation
7. Payslip generated with:
   - Cash advance deductions as line items
   - Remaining balance note (if any)
```

---

## Integration with Existing Systems

### With Payroll System

- Cash advance deductions are treated as standard PayrollItem records
- Deductions are included in total_deductions calculation
- Net pay is automatically recalculated
- Payslip display includes cash advance deductions

### With Employee Model

- Employee has many CashAdvances
- Enables querying employee's advance history

---

## Error Handling

- Amount must be positive
- Only active advances can be deducted
- Cannot delete advance that has been deducted
- Cannot deduct same advance twice

---

## Security Considerations

1. **Authorization**: Only admins can create, delete, and apply cash advances
2. **Data Validation**: All amounts validated as positive decimals
3. **Audit Trail**: All advances recorded with admin who created them and timestamps
