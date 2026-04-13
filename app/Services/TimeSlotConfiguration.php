<?php

namespace App\Services;

use App\Models\WorkSchedule;
use Carbon\Carbon;

/**
 * TimeSlotConfiguration
 * 
 * Replaces all hard-coded time values with dynamic configuration
 * based on WorkSchedule. Single source of truth for time calculations.
 */
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
            'early_out_allowance_minutes' => 5,
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
                'start' => $this->getBreakStartMinutes() - 60,
                'end' => $this->getLunchBoundaryMinutes(),
                'description' => 'Lunch departure window'
            ],
            'lunch_in' => [
                'start' => $this->getLunchBoundaryMinutes(),
                'end' => $this->getBreakEndMinutes() + 60,
                'description' => 'Lunch return window'
            ],
            'afternoon_out' => [
                'start' => $this->getBreakEndMinutes(),
                'end' => $this->getWorkEndMinutes() + 120,
                'description' => 'Afternoon departure window'
            ],
        ];
    }
}
