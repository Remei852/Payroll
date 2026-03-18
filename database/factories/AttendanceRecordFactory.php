<?php

namespace Database\Factories;

use App\Models\AttendanceRecord;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceRecordFactory extends Factory
{
    protected $model = AttendanceRecord::class;

    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory(),
            'attendance_date' => $this->faker->date(),
            'status' => 'Present',
            'time_in_am' => '08:00:00',
            'time_out_lunch' => '12:00:00',
            'time_in_pm' => '13:00:00',
            'time_out_pm' => '17:00:00',
            'late_minutes_am' => 0,
            'late_minutes_pm' => 0,
            'undertime_minutes' => 0,
            'missed_logs_count' => 0,
        ];
    }
}
