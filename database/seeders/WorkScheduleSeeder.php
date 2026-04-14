<?php

namespace Database\Seeders;

use App\Models\WorkSchedule;
use Illuminate\Database\Seeder;

class WorkScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $schedules = [
            ['id' => 1, 'name' => 'Shop Schedule', 'work_start_time' => '08:00:00', 'work_end_time' => '17:00:00', 'break_start_time' => '12:00:00', 'break_end_time' => '13:00:00'],
            ['id' => 2, 'name' => 'Ecotrade Schedule', 'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00', 'break_start_time' => '12:00:00', 'break_end_time' => '13:00:00'],
            ['id' => 3, 'name' => 'JCT Schedule', 'work_start_time' => '09:00:00', 'work_end_time' => '18:00:00', 'break_start_time' => '12:00:00', 'break_end_time' => '13:00:00'],
            ['id' => 4, 'name' => 'CT Print Stop Schedule', 'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00', 'break_start_time' => '12:00:00', 'break_end_time' => '13:00:00'],
            ['id' => 5, 'name' => 'Shop / Eco Schedule', 'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00', 'break_start_time' => '12:00:00', 'break_end_time' => '13:00:00'],
        ];

        $rows = array_map(function ($s) use ($now) {
            return [
                'id'                          => $s['id'],
                'name'                        => $s['name'],
                'work_start_time'             => $s['work_start_time'],
                'work_end_time'               => $s['work_end_time'],
                'break_start_time'            => $s['break_start_time'],
                'break_end_time'              => $s['break_end_time'],
                'grace_period_minutes'        => 15,
                'grace_period_enabled'        => true,
                'undertime_allowance_minutes' => 5,
                'undertime_enabled'           => true,
                'monthly_late_allowance_minutes' => 0,
                'is_working_day'              => true,
                'half_day_hours'              => 4,
                'created_at'                  => $now,
                'updated_at'                  => $now,
            ];
        }, $schedules);

        WorkSchedule::query()->upsert(
            $rows,
            ['id'],
            ['name', 'work_start_time', 'work_end_time', 'break_start_time', 'break_end_time',
             'grace_period_minutes', 'grace_period_enabled', 'undertime_allowance_minutes',
             'undertime_enabled', 'monthly_late_allowance_minutes', 'is_working_day',
             'half_day_hours', 'updated_at']
        );
    }
}
