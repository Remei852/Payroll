# Violation Status Change Flow

## Overview
Violation statuses are changed through a dropdown selector in the modal that appears when you click on a violation row. The system supports three status values: **Pending**, **Reviewed**, and **Letter Sent**.

---

## Frontend Flow

### 1. Status Change Trigger
**Location**: `resources/js/Components/ViolationDetailsModal.jsx` (Line 347-354)

```jsx
<select
    value={status}
    onChange={handleStatusChange}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
>
    <option value="Pending">Pending</option>
    <option value="Reviewed">Reviewed</option>
    <option value="Letter Sent">Letter Sent</option>
</select>
```

### 2. Status Change Handler
**Location**: `resources/js/Components/ViolationDetailsModal.jsx` (Line 45-49)

```jsx
const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    onStatusUpdate(violation.id, newStatus);  // Calls parent callback
};
```

### 3. Parent Component Handler
**Location**: `resources/js/Pages/Violations/Index.jsx` (Line 54-60)

```jsx
const handleStatusUpdate = (id, status) => {
    router.patch(route('admin.violations.update-status', id), { status }, {
        preserveState: true,
        onSuccess: () => {
            setIsModalOpen(false);
        },
    });
};
```

**What happens**:
- Makes a PATCH request to the backend
- Sends the new status in the request body
- Closes the modal on success
- Preserves page state (filters, pagination, etc.)

---

## Backend Flow

### 1. Route Definition
**Location**: `routes/web.php` (assumed)

```
PATCH /admin/violations/{id}/update-status
```

### 2. Controller Method
**Location**: `app/Http/Controllers/ViolationsController.php` (Line 112-130)

```php
public function updateStatus(Request $request, int $id): RedirectResponse
{
    $request->validate([
        'status' => ['required', Rule::in(['Pending', 'Reviewed', 'Letter Sent'])],
    ]);

    try {
        $violation = AttendanceViolation::findOrFail($id);
        $violation->status = $request->input('status');
        $violation->save();

        return redirect()->back()->with('success', 'Violation status updated successfully.');
    } catch (\Exception $e) {
        return redirect()->back()->with('error', 'Failed to update violation status: ' . $e->getMessage());
    }
}
```

**What happens**:
1. Validates that status is one of the three allowed values
2. Finds the violation by ID
3. Updates the status field
4. Saves to database
5. Returns success/error message

### 3. Database Update
**Table**: `attendance_violations`
**Column**: `status`

The status field is updated directly in the database.

---

## Status Values

| Status | Meaning | Use Case |
|--------|---------|----------|
| **Pending** | Violation detected but not yet reviewed | Initial state when violation is created |
| **Reviewed** | Violation has been reviewed by HR | After HR has examined the violation details |
| **Letter Sent** | Formal notice has been sent to employee | After formal action has been taken |

---

## Complete User Flow

1. **User clicks violation row** → Modal opens with violation details
2. **User selects new status from dropdown** → `handleStatusChange()` fires immediately
3. **Status is sent to backend** → PATCH request to `/admin/violations/{id}/update-status`
4. **Backend validates and updates** → Status saved to database
5. **Modal closes** → User returns to violations list
6. **List refreshes** → New status is displayed in the table

---

## Related Features

### Notes Update
**Location**: `resources/js/Components/ViolationDetailsModal.jsx` (Line 38-42)

Notes are updated separately via a "Save Notes" button:
```jsx
const handleSaveNotes = () => {
    onNotesUpdate(violation.id, notes);
    setNotesModified(false);
};
```

Backend endpoint: `PATCH /admin/violations/{id}/update-notes`

### Violation Dismissal
**Location**: `resources/js/Components/ViolationDetailsModal.jsx` (Line 51-60)

Violations can be dismissed (removed from active list):
```jsx
const handleDismissConfirm = () => {
    onDismiss(violation.id);
    setShowDismissConfirm(false);
};
```

Backend endpoint: `POST /admin/violations/{id}/dismiss`

This sets `dismissed_at` and `dismissed_by` timestamps.

---

## Error Handling

### Frontend
- Modal stays open if update fails
- User can retry the status change

### Backend
- Validates status value (must be one of three allowed values)
- Returns error message if violation not found
- Returns error message if database save fails
- All errors are caught and logged

---

## Data Flow Diagram

```
User selects status in dropdown
    ↓
handleStatusChange() fires
    ↓
onStatusUpdate() called with (id, status)
    ↓
router.patch() sends PATCH request
    ↓
ViolationsController::updateStatus()
    ↓
Validate status value
    ↓
Find violation by ID
    ↓
Update status field
    ↓
Save to database
    ↓
Return success response
    ↓
Modal closes
    ↓
Violations list refreshes
```

---

## Testing the Status Change

To test status changes:

1. Navigate to Violations page
2. Click on any violation row
3. In the modal, change the status dropdown
4. Status should update immediately
5. Close modal and verify status changed in the table

To verify in database:
```bash
php artisan tinker
>>> \App\Models\AttendanceViolation::find(1)->status
=> "Reviewed"
```
