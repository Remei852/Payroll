<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * TimeSlotAssigner
 * 
 * Handles complex logic of assigning logs to time slots.
 * Infers log types from time, not from button pressed.
 * Provides clear reasoning for each assignment.
 */
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

        $inferredLogs = $this->inferLogTypes();
        $slots = $this->assignToSlots($inferredLogs, $slots);
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
        $expectedByPosition = ($index % 2 === 0) ? 'IN' : 'OUT';

        if ($index === 0) {
            return 'IN';
        }

        if ($index === 1 && $logCount === 2) {
            return 'OUT';
        }

        if ($index === 1 && $logCount === 3) {
            return 'OUT';
        }

        if ($index === 1) {
            return $minutes < $ranges['lunch_out']['end'] ? 'OUT' : 'IN';
        }

        if ($index === 2 && $logCount === 3) {
            return 'OUT';
        }

        if ($index === 2) {
            return ($minutes >= $ranges['lunch_in']['start'] && $minutes < $ranges['lunch_in']['end']) ? 'IN' : 'OUT';
        }

        if ($index === 3) {
            return 'OUT';
        }

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

        if (!$slots['morning_in']) {
            $validation['errors'][] = 'Missing morning IN time';
            $validation['is_valid'] = false;
        }

        if (!$slots['afternoon_out']) {
            $validation['errors'][] = 'Missing afternoon OUT time';
            $validation['is_valid'] = false;
        }

        if ($slots['morning_in'] && $slots['lunch_out'] && $slots['morning_in'] >= $slots['lunch_out']) {
            $validation['errors'][] = 'Morning IN is after lunch OUT';
            $validation['is_valid'] = false;
        }

        if ($slots['lunch_in'] && $slots['afternoon_out'] && $slots['lunch_in'] >= $slots['afternoon_out']) {
            $validation['errors'][] = 'Lunch IN is after afternoon OUT';
            $validation['is_valid'] = false;
        }

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
