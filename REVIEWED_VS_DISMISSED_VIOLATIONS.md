# Reviewed vs Dismissed Violations - Complete Comparison

## Quick Summary

| Aspect | Reviewed | Dismissed |
|--------|----------|-----------|
| **What it means** | HR has examined the violation | Violation is removed from active list |
| **Database field** | `status` column | `dismissed_at` & `dismissed_by` columns |
| **Visibility** | Still visible in violations list (by default) | Hidden from violations list (unless filtered) |
| **Payroll impact** | Violation deductions still apply | Violation deductions do NOT apply |
| **Action type** | Status change | Dismissal action |
| **Reversible** | Yes (can change status back) | Yes (can be filtered to show dismissed) |

---

## Detailed Comparison

### 1. Database Schema

#### Reviewed Status
```php
// In attendance_violations table
$table->enum('status', ['Pending', 'Reviewed', 'Letter Sent'])->default('Pending');
```

**What it tracks:**
- Current workflow status of the violation
- Three possible values: Pending → Reviewed → Letter Sent
- Updated when HR changes the status dropdown

#### Dismissed Violation
```php
// In attendance_violations table
$table->timestamp('dismissed_at')->nullable();
$table->foreignId('dismissed_by')->nullable()->constrained('users');
```

**What it tracks:**
- When the violation was dismissed (timestamp)
- Who dismissed it (user ID)
- Separate from the status field

---

### 2. Frontend Behavior

#### Changing to "Reviewed" Status
**Location:** `resources/js/Components/ViolationDetailsModal.jsx` (Line 347-354)

```jsx
<select value={status} onChange={handleStatusChange}>
    <option value="Pending">Pending</option>
    <option value="Reviewed">Reviewed</option>
    <option value="Letter Sent">Letter Sent</option>
</select>
```

**User action:** Select "Reviewed" from dropdown
**Result:** Status field updates immediately
**Visibility:** Violation remains in the list

#### Dismissing a Violation
**Location:** `resources/js/Components/ViolationDetailsModal.jsx` (Line 420-430)

```jsx
<button onClick={() => setShowDismissConfirm(true)}>
    Dismiss Violation
</button>
```

**User action:** Click "Dismiss Violation" button → Confirm in dialog
**Result:** Violation is marked as dismissed
**Visibility:** Violation hidden from list (by default)

---

### 3. Backend Processing

#### Reviewed Status Update
**Controller:** `app/Http/Controllers/ViolationsController.php` (Line 112-130)

```php
public function updateStatus(Request $request, int $id): RedirectResponse
{
    $request->validate([
        'status' => ['required', Rule::in(['Pending', 'Reviewed', 'Letter Sent'])],
    ]);

    $violation = AttendanceViolation::findOrFail($id);
    $violation->status = $request->input('status');
    $violation->save();
    
    return redirect()->back()->with('success', 'Violation status updated successfully.');
}
```

**What happens:**
1. Validates status is one of three allowed values
2. Updates the `status` column
3. Saves to database
4. Violation remains in active list

#### Dismissing a Violation
**Controller:** `app/Http/Controllers/ViolationsController.php` (Line 158-177)

```php
public function dismissViolation(Request $request, int $id): JsonResponse
{
    $violation = AttendanceViolation::findOrFail($id);
    $violation->dismiss(auth()->id());  // Sets dismissed_at and dismissed_by
    
    return response()->json([
        'success' => true,
        'message' => 'Violation dismissed successfully.',
    ]);
}
```

**Model method:** `app/Models/AttendanceViolation.php`

```php
public function dismiss(int $userId): bool
{
    $this->dismissed_at = now();
    $this->dismissed_by = $userId;
    return $this->save();
}
```

**What happens:**
1. Sets `dismissed_at` to current timestamp
2. Sets `dismissed_by` to current user ID
3. Saves to database
4. Violation is hidden from active list

---

### 4. Filtering & Visibility

#### Default Violations List
**Location:** `app/Http/Controllers/ViolationsController.php` (Line 25-35)

```php
public function index(Request $request): Response
{
    $query = AttendanceViolation::query();

    // Apply scopeActive by default to exclude dismissed violations
    if (!$request->boolean('show_dismissed')) {
        $query->active();  // Filters out dismissed violations
    }
    
    // ... rest of query
}
```

**Model scope:** `app/Models/AttendanceViolation.php`

```php
public function scopeActive(Builder $query): Builder
{
    return $query->whereNull('dismissed_at');
}

public function scopeDismissed(Builder $query): Builder
{
    return $query->whereNotNull('dismissed_at');
}
```

**Result:**
- **By default:** Only violations with `dismissed_at = NULL` are shown
- **With filter:** Can show dismissed violations by setting `show_dismissed=true`
- **Reviewed violations:** Always shown (regardless of status value)

---

### 5. Payroll Impact

#### Reviewed Violations
- **Deductions applied:** YES
- **Reason:** Status is just a workflow indicator, doesn't affect payroll
- **Example:** A violation marked as "Reviewed" still gets deducted from payroll

#### Dismissed Violations
- **Deductions applied:** NO
- **Reason:** Dismissed violations are excluded from payroll calculations
- **Example:** If you dismiss a violation, it won't be deducted from the employee's payroll

**Payroll Service Logic** (assumed in `app/Services/PayrollService.php`):
```php
// Get active (non-dismissed) violations for payroll
$violations = AttendanceViolation::active()
    ->where('employee_id', $employeeId)
    ->whereBetween('violation_date', [$periodStart, $periodEnd])
    ->get();

// Apply deductions only for active violations
foreach ($violations as $violation) {
    // Calculate and apply deduction
}
```

---

### 6. Use Cases

#### When to Mark as "Reviewed"
- HR has examined the violation details
- HR has decided to proceed with formal action
- Violation will be included in payroll deductions
- Example: "This employee was indeed late on March 15, confirmed"

#### When to Mark as "Letter Sent"
- Formal notice has been sent to the employee
- Violation has been formally documented
- Example: "Violation letter sent to employee on March 16"

#### When to Dismiss a Violation
- Violation was detected in error
- Employee has valid explanation (e.g., approved leave)
- Violation should not affect payroll
- HR decides not to take action
- Example: "Employee was on approved leave, dismissing violation"

---

### 7. Data Flow Comparison

#### Reviewed Status Flow
```
User selects "Reviewed" in dropdown
    ↓
handleStatusChange() fires
    ↓
PATCH /admin/violations/{id}/update-status
    ↓
ViolationsController::updateStatus()
    ↓
violation.status = "Reviewed"
    ↓
violation.save()
    ↓
Violation remains in list with new status
    ↓
Deductions still apply in payroll
```

#### Dismissed Violation Flow
```
User clicks "Dismiss Violation" button
    ↓
Confirmation dialog appears
    ↓
User confirms dismissal
    ↓
POST /admin/violations/{id}/dismiss
    ↓
ViolationsController::dismissViolation()
    ↓
violation.dismiss(auth()->id())
    ↓
violation.dismissed_at = now()
violation.dismissed_by = auth()->id()
violation.save()
    ↓
Violation hidden from list
    ↓
Deductions NOT applied in payroll
```

---

### 8. Database Queries

#### Find Active (Non-Dismissed) Violations
```php
// Shows violations that haven't been dismissed
$violations = AttendanceViolation::active()->get();
// Equivalent to: WHERE dismissed_at IS NULL
```

#### Find Dismissed Violations
```php
// Shows violations that have been dismissed
$violations = AttendanceViolation::dismissed()->get();
// Equivalent to: WHERE dismissed_at IS NOT NULL
```

#### Find Violations by Status
```php
// Shows violations with specific status (regardless of dismissal)
$violations = AttendanceViolation::byStatus('Reviewed')->get();
// Equivalent to: WHERE status = 'Reviewed'
```

#### Find Active Violations with Specific Status
```php
// Shows non-dismissed violations with specific status
$violations = AttendanceViolation::active()
    ->byStatus('Reviewed')
    ->get();
// Equivalent to: WHERE dismissed_at IS NULL AND status = 'Reviewed'
```

---

### 9. Summary Table

| Scenario | Reviewed | Dismissed |
|----------|----------|-----------|
| Violation appears in list | ✅ Yes | ❌ No (by default) |
| Can change status | ✅ Yes | ✅ Yes (can un-dismiss) |
| Affects payroll | ✅ Yes | ❌ No |
| Tracks who made change | ❌ No | ✅ Yes (dismissed_by) |
| Tracks when changed | ❌ No | ✅ Yes (dismissed_at) |
| Workflow indicator | ✅ Yes | ❌ No |
| Removal from list | ❌ No | ✅ Yes |
| Can be filtered | ❌ No | ✅ Yes (show_dismissed) |

---

### 10. Key Takeaway

**Reviewed** = "I've looked at this violation and it's valid" (workflow status)
**Dismissed** = "This violation should not be counted" (removal from payroll)

A violation can be both **Reviewed AND Active** (will be deducted from payroll)
A violation can be **Dismissed** (won't be deducted, hidden from list)

The two concepts are independent:
- Status (Pending/Reviewed/Letter Sent) = workflow tracking
- Dismissed (dismissed_at/dismissed_by) = payroll exclusion
