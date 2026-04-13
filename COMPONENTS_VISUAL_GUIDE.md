# Components Visual Guide

## Overview

This guide shows what each new component looks like and how they work together.

---

## 1. AttendanceValidationAlert

### When Valid
```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Valid                                                     │
│                                                             │
│ All time slots are correctly entered and in order.         │
└─────────────────────────────────────────────────────────────┘
```

### When Has Errors
```
┌─────────────────────────────────────────────────────────────┐
│ ✗ Validation Errors                                    [×]  │
│                                                             │
│ • morning_in: No morning IN time recorded                  │
│ • afternoon_out: Times must be in chronological order      │
│                                                             │
│ 💡 Some issues can be auto-corrected. Review and approve. │
└─────────────────────────────────────────────────────────────┘
```

### When Has Warnings
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠ Validation Warnings                                  [×]  │
│                                                             │
│ • afternoon_out: Employee worked very late (9 hours)      │
│ • overtime_minutes: Overtime detected (120 minutes)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. TimeSlotInput

### Normal State
```
┌─────────────────────────────────────────────────────────────┐
│ Time In (AM)                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 08:05                                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Hint: Enter time in HH:MM format                           │
└─────────────────────────────────────────────────────────────┘
```

### Valid State (Green Checkmark)
```
┌─────────────────────────────────────────────────────────────┐
│ Time In (AM)                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 08:05                                              ✓   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Invalid State (Yellow Warning)
```
┌─────────────────────────────────────────────────────────────┐
│ Time In (AM)                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 08:05                                              ⚠   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Times must be in chronological order                       │
└─────────────────────────────────────────────────────────────┘
```

### Error State (Red Border)
```
┌─────────────────────────────────────────────────────────────┐
│ Time In (AM) *                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 08:05                                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Invalid time format (HH:MM)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. AttendanceRecordReviewCard

### Valid Record
```
┌─────────────────────────────────────────────────────────────┐
│ ☐  Mon, Mar 24, 2026                              ✓ Valid  │
│    John Doe • EMP001                                        │
├─────────────────────────────────────────────────────────────┤
│  IN (AM)    OUT (Lunch)  IN (PM)    OUT (PM)               │
│   08:05       12:00       13:00       17:30                │
├─────────────────────────────────────────────────────────────┤
│ [Present]  Rendered: 1.0                                   │
├─────────────────────────────────────────────────────────────┤
│ [Edit]  [Approve]                                          │
└─────────────────────────────────────────────────────────────┘
```

### Record with Errors
```
┌─────────────────────────────────────────────────────────────┐
│ ☐  Mon, Mar 24, 2026                    ✗ 1 error, 1 warn  │
│    John Doe • EMP001                                        │
├─────────────────────────────────────────────────────────────┤
│  IN (AM)    OUT (Lunch)  IN (PM)    OUT (PM)               │
│   08:05       12:00        —         17:30                 │
├─────────────────────────────────────────────────────────────┤
│ [Late]  Rendered: 0.75                                     │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ time_in_pm: No afternoon IN time recorded               │
│ ℹ️ overtime_minutes: Overtime detected (120 minutes)       │
├─────────────────────────────────────────────────────────────┤
│ [Edit]  [Approve]  [Reject]                                │
└─────────────────────────────────────────────────────────────┘
```

### Selected Record
```
┌─────────────────────────────────────────────────────────────┐
│ ☑  Mon, Mar 24, 2026                              ✓ Valid  │
│    John Doe • EMP001                                        │
├─────────────────────────────────────────────────────────────┤
│  IN (AM)    OUT (Lunch)  IN (PM)    OUT (PM)               │
│   08:05       12:00       13:00       17:30                │
├─────────────────────────────────────────────────────────────┤
│ [Present]  Rendered: 1.0                                   │
├─────────────────────────────────────────────────────────────┤
│ [Edit]  [Approve]                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. AttendanceRecordEditModal

### Edit Modal Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Attendance Record                                  [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓ Record updated successfully                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠ Validation Warnings                              [×] │ │
│ │ • afternoon_out: Employee worked very late         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Time In (AM)              Time Out (Lunch)                 │
│ ┌──────────────────────┐  ┌──────────────────────┐         │
│ │ 08:05            ✓  │  │ 12:00                │         │
│ └──────────────────────┘  └──────────────────────┘         │
│                                                             │
│ Time In (PM)              Time Out (PM)                    │
│ ┌──────────────────────┐  ┌──────────────────────┐         │
│ │ 13:00                │  │ 17:30                │         │
│ └──────────────────────┘  └──────────────────────┘         │
│                                                             │
│ Rendered Hours (0-1)      Status                           │
│ ┌──────────────────────┐  ┌──────────────────────┐         │
│ │ 1.0                  │  │ Present              │         │
│ └──────────────────────┘  └──────────────────────┘         │
│                                                             │
│ Notes (0/500)                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Employee was late due to traffic                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Reason for Change (Optional)                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Corrected based on employee request                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                    [Cancel] [Hide Validation] [Save Changes]│
└─────────────────────────────────────────────────────────────┘
```

---

## 5. BulkReview Page

### Page Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Bulk Review - Attendance Records                            │
│ Review and approve attendance records for Mar 1 - Mar 31   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✓ 5 record(s) approved successfully                        │
│                                                             │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│ │ Total        │  │ Valid        │  │ Needs Review │      │
│ │ Records      │  │              │  │              │      │
│ │     50       │  │     48       │  │      2       │      │
│ └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│ Filters                                          [Clear]   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Status: [All Records ▼]  Department: [All Depts ▼]     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                             │
│ ☑ 5 records selected                                       │
│                                    [✓ Approve Selected]    │
│                                                             │
│ ☐  Mon, Mar 24, 2026                              ✓ Valid  │
│    John Doe • EMP001                                        │
│    [IN: 08:05] [OUT: 12:00] [IN: 13:00] [OUT: 17:30]      │
│    [Present] Rendered: 1.0                                 │
│    [Edit] [Approve]                                        │
│                                                             │
│ ☐  Tue, Mar 25, 2026                    ✗ 1 error, 1 warn  │
│    Jane Smith • EMP002                                      │
│    [IN: 08:10] [OUT: 12:00] [IN: —] [OUT: 17:30]          │
│    [Late] Rendered: 0.75                                   │
│    ⚠️ time_in_pm: No afternoon IN time recorded            │
│    [Edit] [Approve] [Reject]                               │
│                                                             │
│ ... more records ...                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Flow

### Editing a Record

```
User clicks "Edit"
        ↓
AttendanceRecordEditModal opens
        ↓
User enters times
        ↓
User clicks "Show Validation"
        ↓
TimeSlotInput components show validation status
        ↓
AttendanceValidationAlert shows errors/warnings
        ↓
User can save or cancel
        ↓
If saved: Record updated, modal closes
```

### Bulk Reviewing Records

```
User navigates to BulkReview page
        ↓
Page loads records and validations
        ↓
Summary cards show statistics
        ↓
User filters records (optional)
        ↓
User selects records using checkboxes
        ↓
AttendanceRecordReviewCard shows each record
        ↓
User can edit individual records
        ↓
User clicks "Approve Selected"
        ↓
Records are approved and page refreshes
```

---

## Color Scheme

### Status Colors
- **Green**: Valid, Present, Approved
- **Red**: Invalid, Absent, Error
- **Yellow**: Warning, Late, Needs Review
- **Blue**: Info, Selected, Action
- **Gray**: Disabled, Neutral

### Component Colors
- **AttendanceValidationAlert**: Red (errors), Yellow (warnings), Blue (info)
- **TimeSlotInput**: Green (valid), Yellow (warning), Red (error)
- **AttendanceRecordReviewCard**: Blue (selected), White (normal)
- **BulkReview**: Green (valid), Yellow (needs review), Blue (selected)

---

## Responsive Design

All components are responsive and work on:
- Desktop (1920px+)
- Laptop (1366px)
- Tablet (768px)
- Mobile (375px)

### Mobile Adjustments
- Cards stack vertically
- Time slots display in 2x2 grid instead of 4 columns
- Buttons stack vertically
- Filters collapse into accordion

---

## Accessibility

All components include:
- Proper ARIA labels
- Keyboard navigation support
- Color contrast compliance
- Focus indicators
- Error announcements

---

## Animation & Transitions

- Smooth transitions on hover
- Loading spinners for async operations
- Fade in/out for modals
- Slide animations for alerts

---

## Summary

The new components work together to provide:
1. **Real-time validation** as users edit records
2. **Clear error messages** with specific field information
3. **Bulk review interface** for efficient record management
4. **Consistent styling** across all components
5. **Responsive design** for all devices
6. **Accessibility** for all users

All components are production-ready and can be deployed immediately.
