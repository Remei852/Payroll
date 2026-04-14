<?php

namespace Database\Seeders;

use App\Models\WorkSchedule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WorkScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $schedules = [
            ['name' => 'Shop Schedule',         'work_start_time' => '08:00:00', 'work_end_time' => '17:00:00'],
            ['name' => 'Ecotrade Schedule',      'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00'],
            ['name' => 'JCT Schedule',           'work_start_time' => '09:00:00', 'work_end_time' => '18:00:00'],
            ['name' => 'CT Print Stop Schedule', 'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00'],
            ['name' => 'Shop / Eco Schedule',    'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00'],
        ];

        foreach ($schedules as $schedule) {
            WorkSchedule::firstOrCreate(
                ['name' => $schedule['name']],
                [
                    'work_start_time'             => $schedule['work_start_time'],
                    'work_end_time'               => $schedule['work_end_time'],
                    'break_start_time'            => '12:00:00',
                    'break_end_time'              => '13:00:00',
                    'grace_period_minutes'        => 15,
                    'grace_period_enabled'        => true,
                    'undertime_allowance_minutes' => 5,
                    'undertime_enabled'           => true,
                    'monthly_late_allowance_minutes' => 0,
                    'is_working_day'              => true,
                    'half_day_hours'              => 4,
                ]
            );
        }

        // ── PostgreSQL sequence fix ───────────────────────────────────────────
        // firstOrCreate uses the sequence correctly, but reset just in case
        // this seeder is run after other seeders that used explicit IDs.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("SELECT setval('work_schedules_id_seq', (SELECT COALESCE(MAX(id), 1) FROM work_schedules))");
        }
    }
}
