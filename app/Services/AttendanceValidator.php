<?php

namespace App\Services;

use App\Models\WorkSchedule;
use Carbon\Carbon;

/**
 * AttendanceValidator
 * 
 * Validates attendance data for integrity.
 * Distinguishes between errors and warnings.
 * Identifies auto-correctable issues.
 */
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

            if ($morningInMinutes < $workStartMinutes - 120) {
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

            if ($afternoonOutMinutes > $workEndMinutes + 240) {
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
