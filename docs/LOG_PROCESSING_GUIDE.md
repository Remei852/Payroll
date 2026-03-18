# Log Processing Guide - How Logs Are Assigned to Time Slots

## Table of Contents
1. [Overview](#overview)
2. [The Four Time Slots](#the-four-time-slots)
3. [Why We Don't Trust log_type](#why-we-dont-trust-log_type)
4. [The Lunch Boundary Rule](#the-lunch-boundary-rule)
5. [Step-by-Step Processing](#step-by-step-processing)
6. [Assignment Rules](#assignment-rules)
7. [Examples](#examples)
8. [Edge Cases](#edge-cases)

---

## Overview

The attendance system processes biometric logs and assigns them to **4 specific time slots**:
1. **Morning IN** (time_in_am)
2. **Lunch OUT** (time_out_lunch)
3. **Lunch IN** (time_in_pm)
4. **Afternoon OUT** (time_out_pm)

This assignment is based on **WHEN the log occurred** (time of day), NOT what button the employee pressed.

---

## The Four Time Slots

### Time Slot Definitions

| Slot | Field Name | Purpose | Expected Time Range |
|------|------------|---------|---------------------|
| **Morning IN** | `time_in_am` | Employee arrives for work | 6:00 AM - 11:59 AM |
| **Lunch OUT** | `time_out_lunch` | Employee leaves for lunch | 11:00 AM - 12:44 PM |
| **Lunch IN** | `time_in_pm` | Employee returns from lunch | 12:45 PM onwards |
| **Afternoon OUT** | `time_out_pm` | Employee leaves for the day | 12:45 PM onwards (last OUT) |

### Visual Timeline

```
6:00 AM                    12:00 PM    12:45 PM                    6:00 PM
|--------------------------|-----------|---------------------------|
        Morning IN          Lunch OUT   Lunch IN    Afternoon OUT
        (time_in_am)    (time_out_lunch) (time_in_pm)  (time_out_pm)
```

---

## Why We Don't Trust log_type

### The Problem

Employees frequently **misclick** the IN/OUT button on the biometric device:
- Press IN when they should press OUT
- Press OUT when they should press IN
- Double-tap the same button
- Press wrong button due to confusion

### Real Examples

```
❌ WRONG (What employee pressed):
08:00 OUT  ← Should be IN (morning arrival)
12:00 IN   ← Should be OUT (leaving for lunch)
13:00 OUT  ← Should be IN (returning from lunch)
17:00 IN   ← Should be OUT (leaving for day)

✅ CORRECT (What system infers):
08:00 IN   ← Morning arrival
12:00 OUT  ← Leaving for lunch
13:00 IN   ← Returning from lunch
17:00 OUT  ← Leaving for day
```

### The Solution

**Ignore the `log_type` field completely!**

Instead, infer the correct type based on:
1. **Time of day** (when the log occurred)
2. **Position in sequence** (1st, 2nd, 3rd, 4th log)
3. **Lunch boundary rule** (12:45 PM)

---

## The Lunch Boundary Rule

### The Critical Time: 12:45 PM

**12:45 PM (765 minutes from midnight)** is the boundary between lunch OUT and lunch IN.

### Why 12:45 PM?

- **Before 12:45 PM** = Lunch OUT period (employees leaving for lunch)
- **At/After 12:45 PM** = Lunch IN period (employees returning from lunch)

This prevents confusion when employees log around noon time.

### The Rule

```
Time < 12:45 PM  → Treat as LUNCH OUT
Time ≥ 12:45 PM  → Treat as LUNCH IN
```

### Examples

```
12:00 PM → Lunch OUT (before boundary)
12:30 PM → Lunch OUT (before boundary)
12:44 PM → Lunch OUT (before boundary)
12:45 PM → Lunch IN (at boundary)
12:46 PM → Lunch IN (after boundary)
13:00 PM → Lunch IN (after boundary)
```

---

## Step-by-Step Processing

### Step 1: Collect All Logs for the Date

```sql
SELECT * FROM attendance_logs 
WHERE DATE(log_datetime) = '2026-02-03'
AND employee_code = 'SHOP2025-22'
ORDER BY log_datetime ASC
```

**Example Result:**
```
08:05:23 IN
12:02:45 OUT
13:05:29 IN
17:37:41 OUT
```

### Step 2: Remove Exact Duplicates

Remove logs with same timestamp and same type:
```
08:05:23 IN
08:05:23 IN  ← DUPLICATE (removed)
12:02:45 OUT
```

### Step 3: Remove Double-Taps

Remove logs less than 2 minutes apart:
```
08:05:23 IN
08:06:15 IN  ← DOUBLE-TAP (removed, < 2 min)
12:02:45 OUT
```

### Step 4: Infer Correct Log Types

**Ignore the `log_type` field!** Infer based on time and position:

```php
// Position-based inference
$expectedByPosition = ($index % 2 === 0) ? 'IN' : 'OUT';

// Time-based inference
if ($index === 0) {
    $inferredType = 'IN'; // First log is always IN
}
elseif ($index === 1) {
    if ($time < 12:45 PM) {
        $inferredType = 'OUT'; // Lunch OUT
    } else {
        $inferredType = 'IN'; // Lunch IN (skipped lunch OUT)
    }
}
// ... and so on
```

### Step 5: Assign to Time Slots

Based on inferred types and time ranges:

```php
if ($inferredType === 'IN') {
    if ($time >= 6:00 AM && $time < 12:00 PM && !$morningIn) {
        $morningIn = $time; // Morning IN slot
    }
    elseif ($time >= 12:45 PM && !$lunchIn) {
        $lunchIn = $time; // Lunch IN slot
    }
}
elseif ($inferredType === 'OUT') {
    if ($time >= 11:00 AM && $time < 12:45 PM && !$lunchOut) {
        $lunchOut = $time; // Lunch OUT slot
    }
    elseif ($time >= 12:45 PM) {
        $afternoonOut = $time; // Afternoon OUT slot (last OUT)
    }
}
```

---

## Assignment Rules

### Morning IN (time_in_am)

**Rule:** First IN log between 6:00 AM - 11:59 AM

```
Time Range: 6:00 AM - 11:59 AM
Type: IN
Priority: First IN in this range
Fallback: If no IN in range, use any IN as morning IN
```

**Examples:**
```
✅ 06:00 AM IN → Morning IN
✅ 08:00 AM IN → Morning IN
✅ 11:59 AM IN → Morning IN
❌ 12:00 PM IN → Not morning IN (too late)
```

### Lunch OUT (time_out_lunch)

**Rule:** First OUT log between 11:00 AM - 12:44 PM

```
Time Range: 11:00 AM - 12:44 PM
Type: OUT
Priority: First OUT in this range
Boundary: Before 12:45 PM
```

**Examples:**
```
✅ 11:00 AM OUT → Lunch OUT
✅ 12:00 PM OUT → Lunch OUT
✅ 12:44 PM OUT → Lunch OUT
❌ 12:45 PM OUT → Not lunch OUT (at/after boundary)
```

### Lunch IN (time_in_pm)

**Rule:** First IN log at/after 12:45 PM

```
Time Range: 12:45 PM onwards
Type: IN
Priority: First IN at/after lunch boundary
Boundary: At/after 12:45 PM
```

**Examples:**
```
❌ 12:44 PM IN → Not lunch IN (before boundary)
✅ 12:45 PM IN → Lunch IN
✅ 13:00 PM IN → Lunch IN
✅ 14:00 PM IN → Lunch IN (late return)
```

### Afternoon OUT (time_out_pm)

**Rule:** Last OUT log at/after 12:45 PM

```
Time Range: 12:45 PM onwards
Type: OUT
Priority: LAST OUT in this range (not first!)
Boundary: At/after 12:45 PM
```

**Examples:**
```
❌ 12:44 PM OUT → Not afternoon OUT (before boundary)
✅ 12:45 PM OUT → Afternoon OUT
✅ 17:00 PM OUT → Afternoon OUT
✅ 18:00 PM OUT → Afternoon OUT (overtime)
```

**Important:** If multiple OUTs after 12:45 PM, use the LAST one!

---

## Examples

### Example 1: Perfect Attendance (4 Logs)

**Raw Logs:**
```
08:00:00 IN
12:00:00 OUT
13:00:00 IN
17:00:00 OUT
```

**Processing:**
1. Remove duplicates: None
2. Remove double-taps: None
3. Infer types: All correct (based on time)
4. Assign to slots:
   - Morning IN: 08:00:00 (first IN before 12:00 PM)
   - Lunch OUT: 12:00:00 (first OUT before 12:45 PM)
   - Lunch IN: 13:00:00 (first IN at/after 12:45 PM)
   - Afternoon OUT: 17:00:00 (last OUT after 12:45 PM)

**Result:**
```
time_in_am: 08:00:00
time_out_lunch: 12:00:00
time_in_pm: 13:00:00
time_out_pm: 17:00:00
```

### Example 2: Misclicked Logs

**Raw Logs (What employee pressed):**
```
08:00:00 OUT  ← WRONG! Should be IN
12:00:00 IN   ← WRONG! Should be OUT
13:00:00 OUT  ← WRONG! Should be IN
17:00:00 IN   ← WRONG! Should be OUT
```

**Processing:**
1. Remove duplicates: None
2. Remove double-taps: None
3. **Infer types (IGNORE log_type!):**
   - 08:00:00 → Position 0, before 12:00 PM → **IN**
   - 12:00:00 → Position 1, before 12:45 PM → **OUT**
   - 13:00:00 → Position 2, at/after 12:45 PM → **IN**
   - 17:00:00 → Position 3, after 12:45 PM → **OUT**
4. Assign to slots:
   - Morning IN: 08:00:00
   - Lunch OUT: 12:00:00
   - Lunch IN: 13:00:00
   - Afternoon OUT: 17:00:00

**Result:**
```
time_in_am: 08:00:00
time_out_lunch: 12:00:00
time_in_pm: 13:00:00
time_out_pm: 17:00:00
```

✅ **System corrected all misclicks!**

### Example 3: Missing Lunch Logs (2 Logs Only)

**Raw Logs:**
```
08:00:00 IN
17:00:00 OUT
```

**Processing:**
1. Remove duplicates: None
2. Remove double-taps: None
3. Infer types:
   - 08:00:00 → Position 0 → **IN**
   - 17:00:00 → Position 1, only 2 logs → **OUT**
4. Assign to slots:
   - Morning IN: 08:00:00 (first IN before 12:00 PM)
   - Lunch OUT: null (no OUT before 12:45 PM)
   - Lunch IN: null (no IN at/after 12:45 PM)
   - Afternoon OUT: 17:00:00 (last OUT after 12:45 PM)

**Result:**
```
time_in_am: 08:00:00
time_out_lunch: null
time_in_pm: null
time_out_pm: 17:00:00
```

**Status:** Missed Log (missing lunch logs)

### Example 4: Late Arrival (Only Afternoon Logs)

**Raw Logs:**
```
13:00:00 IN
17:00:00 OUT
```

**Processing:**
1. Remove duplicates: None
2. Remove double-taps: None
3. Infer types:
   - 13:00:00 → Position 0, but after 12:45 PM → **IN**
   - 17:00:00 → Position 1 → **OUT**
4. Assign to slots:
   - Morning IN: 13:00:00 (fallback: use any IN)
   - Lunch OUT: null
   - Lunch IN: 13:00:00 (first IN at/after 12:45 PM)
   - Afternoon OUT: 17:00:00

**Result:**
```
time_in_am: 13:00:00
time_out_lunch: null
time_in_pm: 13:00:00
time_out_pm: 17:00:00
```

**Status:** Half Day, Late (only afternoon present)

### Example 5: Multiple Afternoon OUTs

**Raw Logs:**
```
08:00:00 IN
12:00:00 OUT
13:00:00 IN
15:00:00 OUT  ← First afternoon OUT
17:00:00 OUT  ← Second afternoon OUT
```

**Processing:**
1. Remove duplicates: None
2. Remove double-taps: None
3. Infer types: All correct
4. Assign to slots:
   - Morning IN: 08:00:00
   - Lunch OUT: 12:00:00
   - Lunch IN: 13:00:00
   - Afternoon OUT: **17:00:00** (LAST OUT, not first!)

**Result:**
```
time_in_am: 08:00:00
time_out_lunch: 12:00:00
time_in_pm: 13:00:00
time_out_pm: 17:00:00
```

**Note:** Used 17:00 (last OUT), not 15:00 (first OUT)

---

## Edge Cases

### Edge Case 1: Log Exactly at 12:45 PM

**Question:** Is 12:45:00 PM considered lunch OUT or lunch IN?

**Answer:** Lunch IN (at/after boundary)

```
12:44:59 PM → Lunch OUT (before boundary)
12:45:00 PM → Lunch IN (at boundary)
12:45:01 PM → Lunch IN (after boundary)
```

### Edge Case 2: No Morning IN

**Raw Logs:**
```
12:30:00 OUT
13:00:00 IN
17:00:00 OUT
```

**Result:**
```
time_in_am: null (no IN before 12:00 PM)
time_out_lunch: 12:30:00
time_in_pm: 13:00:00
time_out_pm: 17:00:00
```

**Status:** Half Day (no morning presence)

### Edge Case 3: All Logs Before 12:45 PM

**Raw Logs:**
```
08:00:00 IN
12:00:00 OUT
12:30:00 IN
12:44:00 OUT
```

**Result:**
```
time_in_am: 08:00:00
time_out_lunch: 12:00:00
time_in_pm: 12:30:00 (even though before 12:45)
time_out_pm: null (no OUT at/after 12:45)
```

**Status:** Half Day (no afternoon OUT)

### Edge Case 4: Double-Tap at Boundary

**Raw Logs:**
```
08:00:00 IN
12:00:00 OUT
12:45:00 IN
12:46:00 IN  ← Double-tap (< 2 min)
17:00:00 OUT
```

**Processing:**
1. Remove double-tap: 12:46:00 removed
2. Remaining: 08:00, 12:00, 12:45, 17:00

**Result:**
```
time_in_am: 08:00:00
time_out_lunch: 12:00:00
time_in_pm: 12:45:00
time_out_pm: 17:00:00
```

---

## Summary

### Key Principles

1. **Time-Based Assignment**
   - Logs are assigned based on WHEN they occurred
   - NOT based on what button was pressed

2. **Lunch Boundary (12:45 PM)**
   - Critical dividing line between lunch OUT and lunch IN
   - Before 12:45 = Lunch OUT period
   - At/After 12:45 = Lunch IN period

3. **Ignore log_type Field**
   - Employees frequently misclick
   - System infers correct type from time and position

4. **Four Time Slots**
   - Morning IN: First IN before noon
   - Lunch OUT: First OUT before 12:45 PM
   - Lunch IN: First IN at/after 12:45 PM
   - Afternoon OUT: LAST OUT after 12:45 PM

5. **Fallback Rules**
   - If no morning IN found, use any IN
   - If no lunch OUT found, check for any OUT after 11 AM
   - Afternoon OUT always uses LAST OUT

### Benefits

✅ **Accurate** - Not affected by misclicks
✅ **Consistent** - Same rules for everyone
✅ **Fair** - Employees get credit for actual work time
✅ **Automated** - No manual corrections needed
✅ **Transparent** - Clear rules, easy to understand

---

## Technical Reference

### Constants

```php
LUNCH_BOUNDARY = 765 // 12:45 PM in minutes from midnight
DOUBLE_TAP_THRESHOLD = 120 // 2 minutes in seconds
```

### Time Ranges (in minutes from midnight)

```php
MORNING_IN_START = 360   // 6:00 AM
MORNING_IN_END = 720     // 12:00 PM
LUNCH_OUT_START = 660    // 11:00 AM
LUNCH_OUT_END = 765      // 12:45 PM
LUNCH_IN_START = 765     // 12:45 PM
AFTERNOON_OUT_START = 765 // 12:45 PM
```

### Methods

- `inferLogTypesFromTime()` - Infer correct log types
- `assignLogsToTimeSlotsFromInferred()` - Assign to time slots
- `removeExactDuplicates()` - Remove duplicate logs
- `pairInOutLogs()` - Create IN-OUT pairs for duration

---

**Last Updated:** February 25, 2026  
**Status:** Production Ready ✅

