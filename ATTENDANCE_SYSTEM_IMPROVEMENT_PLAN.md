# Attendance System Improvement Plan
## Clean, Efficient, and Maintainable Code Architecture

### Overview
This plan addresses:
1. Elimination of hard-coded time values
2. Proper time slot assignment with human behavior consideration
3. Data validation and integrity mechanisms
4. UI/UX for handling inconsistencies
5. Clean, efficient, and understandable code

---

## PART 1: ELIMINATE HARD-CODED VALUES

### Current Problem
```php
// ❌ Hard-coded everywhere
private const GRACE_PERIOD_MINUTES = 15;
private const EARLY_OUT_ALLOWANCE_MINUTES = 5;
private const LUNCH_BREAK_START = '12:00:00';
private const LUNCH_BREAK_END = '13:00:00';
$lunchBoundary = 765; // 12:45 PM in minutes
```

### Solution: Create TimeSlotConfiguration Class

```php
// app/Services/TimeSlotConfiguration.php
namespace App\Services;

use App\Models\WorkSchedule;
use Carbon\Carbon;

class TimeSlotConfiguration
{
    private WorkSchedule $schedule;
    private array $config;

    public function __construct(WorkSchedule $schedule)
    {
        $this->schedule = $schedule;
        $this->config = $this->buildConfiguration();
    }

    private function buildConfiguration(): array
    {
        $breakStart = Carbon::parse($this->schedule->break_start_time);
        $breakEnd = Carbon::parse($this->schedule->break_end_time);
        $workStart = Carbon::parse($this->schedule->work_start_time);
        $workEnd = Carbon::parse($this->schedule->work_end_time);

        return [
            'work_start_minutes' => $workStart->hour * 60 + $workStart->minute,
            'work_end_minutes' => $workEnd->hour * 60 + $workEnd->minute,
            'break_start_minutes' => $breakStart->hour * 60 + $breakStart->minute,
            'break_end_minutes' => $breakEnd->hour * 60 + $breakEnd->minute,
            'lunch_boundary_minutes' => $this->calculateLunchBoundary($breakStart, $breakEnd),
            'grace_period_minutes' => $this->schedule->grace_period_minutes ?? 15,
            'early_out_allowance_minutes' => 5, // Configurable per schedule if needed
        ];
    }

    private function calculateLunchBoundary(Carbon $breakStart, Carbon $breakEnd): int
    {
        $midpoint = $breakStart->copy()->addMinutes(
            $breakStart->diffInMinutes($breakEnd) / 2
        );
        return $midpoint->hour * 60 + $midpoint->minute;
    }

    public function getWorkStartMinutes(): int
    {
        return $this->config['work_start_minutes'];
    }

    public function getWorkEndMinutes(): int
    {
        return $this->config['work_end_minutes'];
    }

    public function getBreakStartMinutes(): int
    {
        return $this->config['break_start_minutes'];
    }

    public function getBreakEndMinutes(): int
    {
        return $this->config['break_end_minutes'];
    }

    public function getLunchBoundaryMinutes(): int
    {
        return $this->config['lunch_boundary_minutes'];
    }

    public function getGracePeriodMinutes(): int
    {
        return $this->config['grace_period_minutes'];
    }

    public function getEarlyOutAllowanceMinutes(): int
    {
        return $this->config['early_out_allowance_minutes'];
    }

    public function getTimeSlotRanges(): array
    {
        return [
            'morning_in' => [
                'start' => $this->getWorkStartMinutes(),
                'end' => $this->getBreakStartMinutes(),
                'description' => 'Morning arrival window'
            ],
            'lunch_out' => [
                'start' => $this->getBreakStartMinutes() - 60, // 1 hour before break
                'end' => $this->getLunchBoundaryMinutes(),
                'description' => 'Lunch departure window'
            ],
            'lunch_in' => [
                'start' => $this->getLunchBoundaryMinutes(),
                'end' => $this->getBreakEndMinutes() + 60, // 1 hour after break
                'description' => 'Lunch return window'
            ],
            'afternoon_out' => [
                'start' => $this->getBreakEndMinutes(),
                'end' => $this->getWorkEndMinutes() + 120, // 2 hours after work end
                'description' => 'Afternoon departure window'
            ],
        ];
    }
}
```

---

## PART 2: TIME SLOT ASSIGNMENT WITH HUMAN BEHAVIOR

### Problem: Complex Human Behavior
- Employees forget to clock out for lunch
- Employees clock in/out at wrong times
- Employees work irregular hours
- System must be flexible yet maintain integrity

### Solution: TimeSlotAssigner Class

```php
// app/Services/TimeSlotAssigner.php
namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class TimeSlotAssigner
{
    private TimeSlotConfiguration $config;
    private Collection $logs;
    private Carbon $date;
    private array $assignmentLog = [];

    public function __construct(TimeSlotConfiguration $config, Collection $logs, Carbon $date)
    {
        $this->config = $config;
        $this->logs = $logs;
        $this->date = $date;
    }

    public function assign(): array
    {
        $slots = [
            'morning_in' => null,
            'lunch_out' => null,
            'lunch_in' => null,
            'afternoon_out' => null,
        ];

        // Step 1: Infer log types from time (not button pressed)
        $inferredLogs = $this->inferLogTypes();

        // Step 2: Assign to time slots based on inferred types
        $slots = $this->assignToSlots($inferredLogs, $slots);

        // Step 3: Validate assignments
        $validation = $this->validateAssignments($slots);

        return [
            'slots' => $slots,
            'inferred_logs' => $inferredLogs,
            'validation' => $validation,
            'assignment_log' => $this->assignmentLog,
        ];
    }

    private function inferLogTypes(): array
    {
        $inferred = [];
        $ranges = $this->config->getTimeSlotRanges();
        $logCount = $this->logs->count();

        foreach ($this->logs as $index => $log) {
            $minutes = $this->timeToMinutes($log->log_datetime);
            $inferredType = $this->determineLogType($index, $minutes, $logCount, $ranges);

            $inferred[] = [
                'datetime' => $log->log_datetime,
                'type' => $inferredType,
                'time' => $log->log_datetime->format('H:i:s'),
                'minutes' => $minutes,
                'original_type' => strtoupper($log->log_type),
                'corrected' => strtoupper($log->log_type) !== $inferredType,
                'reason' => $this->getInferenceReason($index, $minutes, $logCount, $inferredType),
            ];

            if (strtoupper($log->log_type) !== $inferredType) {
                $this->assignmentLog[] = "Log {$index + 1}: Corrected from {$log->log_type} to {$inferredType}";
            }
        }

        return $inferred;
    }

    private function determineLogType(int $index, int $minutes, int $logCount, array $ranges): string
    {
        // Position-based inference (alternating IN-OUT pattern)
        $expectedByPosition = ($index % 2 === 0) ? 'IN' : 'OUT';

        // Time-based inference
        if ($index === 0) {
            return 'IN'; // First log is always IN
        }

        if ($index === 1 && $logCount === 2) {
            return 'OUT'; // Only 2 logs: IN-OUT
        }

        if ($index === 1 && $logCount === 3) {
            return 'OUT'; // 3 logs: IN-OUT-OUT (lunch OUT)
        }

        if ($index === 1) {
            // 4+ logs: check time
            return $minutes < $ranges['lunch_out']['end'] ? 'OUT' : 'IN';
        }

        if ($index === 2 && $logCount === 3) {
            return 'OUT'; // 3 logs: last is OUT
        }

        if ($index === 2) {
            // 4+ logs: check time
            return ($minutes >= $ranges['lunch_in']['start'] && $minutes < $ranges['lunch_in']['end']) ? 'IN' : 'OUT';
        }

        if ($index === 3) {
            return 'OUT'; // Fourth log is OUT
        }

        // More than 4 logs: use alternating pattern
        return $expectedByPosition;
    }

    private function getInferenceReason(int $index, int $minutes, int $logCount, string $type): string
    {
        if ($index === 0) return 'First log is always IN (morning arrival)';
        if ($index === 1 && $logCount === 2) return 'Only 2 logs: second is OUT (end of day)';
        if ($index === 1 && $logCount === 3) return '3 logs: second is OUT (lunch departure)';
        if ($index === 1) return $type === 'OUT' ? 'Before lunch boundary: OUT' : 'After lunch boundary: IN';
        if ($index === 2 && $logCount === 3) return '3 logs: third is OUT (end of day)';
        if ($index === 2) return $type === 'IN' ? 'In lunch return window: IN' : 'After lunch return: OUT';
        if ($index === 3) return 'Fourth log is OUT (end of day)';
        return 'Alternating IN-OUT pattern';
    }

    private function assignToSlots(array $inferredLogs, array $slots): array
    {
        $ranges = $this->config->getTimeSlotRanges();

        foreach ($inferredLogs as $log) {
            $minutes = $log['minutes'];
            $type = $log['type'];

            if ($type === 'IN') {
                if ($minutes >= $ranges['morning_in']['start'] && $minutes < $ranges['morning_in']['end'] && !$slots['morning_in']) {
                    $slots['morning_in'] = $log['time'];
                    $this->assignmentLog[] = "Assigned {$log['time']} to morning_in";
                } elseif ($minutes >= $ranges['lunch_in']['start'] && !$slots['lunch_in']) {
                    $slots['lunch_in'] = $log['time'];
                    $this->assignmentLog[] = "Assigned {$log['time']} to lunch_in";
                } elseif (!$slots['morning_in']) {
                    $slots['morning_in'] = $log['time'];
                    $this->assignmentLog[] = "Assigned {$log['time']} to morning_in (fallback)";
                }
            } elseif ($type === 'OUT') {
                if ($minutes >= $ranges['lunch_out']['start'] && $minutes < $ranges['lunch_out']['end'] && !$slots['lunch_out']) {
                    $slots['lunch_out'] = $log['time'];
                    $this->assignmentLog[] = "Assigned {$log['time']} to lunch_out";
                } elseif ($minutes >= $ranges['lunch_in']['start']) {
                    $slots['afternoon_out'] = $log['time'];
                    $this->assignmentLog[] = "Assigned {$log['time']} to afternoon_out";
                } elseif (!$slots['lunch_out']) {
                    $slots['lunch_out'] = $log['time'];
                    $this->assignmentLog[] = "Assigned {$log['time']} to lunch_out (fallback)";
                }
            }
        }

        return $slots;
    }

    private function validateAssignments(array $slots): array
    {
        $validation = [
            'is_valid' => true,
            'warnings' => [],
            'errors' => [],
        ];

        // Check for missing critical slots
        if (!$slots['morning_in']) {
            $validation['errors'][] = 'Missing morning IN time';
            $validation['is_valid'] = false;
        }

        if (!$slots['afternoon_out']) {
            $validation['errors'][] = 'Missing afternoon OUT time';
            $validation['is_valid'] = false;
        }

        // Check for logical inconsistencies
        if ($slots['morning_in'] && $slots['lunch_out'] && $slots['morning_in'] >= $slots['lunch_out']) {
            $validation['errors'][] = 'Morning IN is after lunch OUT';
            $validation['is_valid'] = false;
        }

        if ($slots['lunch_in'] && $slots['afternoon_out'] && $slots['lunch_in'] >= $slots['afternoon_out']) {
            $validation['errors'][] = 'Lunch IN is after afternoon OUT';
            $validation['is_valid'] = false;
        }

        // Warnings for missing optional slots
        if (!$slots['lunch_out'] && $slots['lunch_in']) {
            $validation['warnings'][] = 'Missing lunch OUT time (employee may have skipped lunch)';
        }

        if (!$slots['lunch_in'] && $slots['lunch_out']) {
            $validation['warnings'][] = 'Missing lunch IN time (employee may have worked through lunch)';
        }

        return $validation;
    }

    private function timeToMinutes(Carbon $time): int
    {
        return $time->hour * 60 + $time->minute;
    }
}
```

---

## PART 3: DATA VALIDATION & INTEGRITY

### Solution: AttendanceValidator Class

```php
// app/Services/AttendanceValidator.php
namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\WorkSchedule;
use Carbon\Carbon;

class AttendanceValidator
{
    private WorkSchedule $schedule;
    private array $slots;
    private array $issues = [];

    public function __construct(WorkSchedule $schedule, array $slots)
    {
        $this->schedule = $schedule;
        $this->slots = $slots;
    }

    public function validate(): array
    {
        $this->validateTimeLogic();
        $this->validateScheduleCompliance();
        $this->validateDataIntegrity();

        return [
            'is_valid' => empty($this->issues['errors']),
            'issues' => $this->issues,
            'can_auto_correct' => $this->canAutoCorrect(),
            'requires_manual_review' => $this->requiresManualReview(),
        ];
    }

    private function validateTimeLogic(): void
    {
        if (!$this->slots['morning_in']) {
            $this->issues['errors'][] = [
                'field' => 'morning_in',
                'message' => 'No morning IN time recorded',
                'severity' => 'critical',
                'auto_correctable' => false,
            ];
        }

        if ($this->slots['morning_in'] && $this->slots['lunch_out']) {
            if ($this->slots['morning_in'] >= $this->slots['lunch_out']) {
                $this->issues['errors'][] = [
                    'field' => 'time_sequence',
                    'message' => 'Morning IN time is after lunch OUT time',
                    'severity' => 'critical',
                    'auto_correctable' => false,
                ];
            }
        }

        if ($this->slots['lunch_in'] && $this->slots['afternoon_out']) {
            if ($this->slots['lunch_in'] >= $this->slots['afternoon_out']) {
                $this->issues['errors'][] = [
                    'field' => 'time_sequence',
                    'message' => 'Lunch IN time is after afternoon OUT time',
                    'severity' => 'critical',
                    'auto_correctable' => false,
                ];
            }
        }
    }

    private function validateScheduleCompliance(): void
    {
        $config = new TimeSlotConfiguration($this->schedule);

        if ($this->slots['morning_in']) {
            $morningInMinutes = $this->timeToMinutes($this->slots['morning_in']);
            $workStartMinutes = $config->getWorkStartMinutes();

            if ($morningInMinutes < $workStartMinutes - 120) { // 2 hours before
                $this->issues['warnings'][] = [
                    'field' => 'morning_in',
                    'message' => 'Employee clocked in very early (2+ hours before work start)',
                    'severity' => 'warning',
                    'auto_correctable' => false,
                ];
            }
        }

        if ($this->slots['afternoon_out']) {
            $afternoonOutMinutes = $this->timeToMinutes($this->slots['afternoon_out']);
            $workEndMinutes = $config->getWorkEndMinutes();

            if ($afternoonOutMinutes > $workEndMinutes + 240) { // 4 hours after
                $this->issues['warnings'][] = [
                    'field' => 'afternoon_out',
                    'message' => 'Employee worked very late (4+ hours after work end)',
                    'severity' => 'warning',
                    'auto_correctable' => false,
                ];
            }
        }
    }

    private function validateDataIntegrity(): void
    {
        // Check for duplicate times
        $times = array_filter([
            $this->slots['morning_in'],
            $this->slots['lunch_out'],
            $this->slots['lunch_in'],
            $this->slots['afternoon_out'],
        ]);

        if (count($times) !== count(array_unique($times))) {
            $this->issues['errors'][] = [
                'field' => 'duplicate_times',
                'message' => 'Duplicate times detected in time slots',
                'severity' => 'critical',
                'auto_correctable' => false,
            ];
        }
    }

    private function canAutoCorrect(): bool
    {
        foreach ($this->issues['errors'] ?? [] as $error) {
            if (!$error['auto_correctable']) {
                return false;
            }
        }
        return true;
    }

    private function requiresManualReview(): bool
    {
        return !empty($this->issues['errors']) || !empty($this->issues['warnings']);
    }

    private function timeToMinutes(string $time): int
    {
        [$hours, $minutes] = explode(':', $time);
        return (int)$hours * 60 + (int)$minutes;
    }
}
```

