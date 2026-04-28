<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            ['id' => 1, 'name' => 'Shop',          'payroll_frequency' => 'SEMI_MONTHLY', 'work_start_time' => '08:00:00', 'work_end_time' => '17:00:00'],
            ['id' => 2, 'name' => 'Ecotrade',       'payroll_frequency' => 'SEMI_MONTHLY', 'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00'],
            ['id' => 3, 'name' => 'JCT',            'payroll_frequency' => 'SEMI_MONTHLY', 'work_start_time' => '09:00:00', 'work_end_time' => '18:00:00'],
            ['id' => 4, 'name' => 'CT Print Stop',  'payroll_frequency' => 'SEMI_MONTHLY', 'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00'],
            ['id' => 5, 'name' => 'Shop / Eco',     'payroll_frequency' => 'SEMI_MONTHLY', 'work_start_time' => '08:30:00', 'work_end_time' => '17:30:00'],
        ];

        foreach ($departments as $dept) {
            DB::table('departments')->updateOrInsert(
                ['id' => $dept['id']],
                [
                    'name'              => $dept['name'],
                    'payroll_frequency' => $dept['payroll_frequency'],
                    'is_active'         => true,
                    'deleted_at'        => null,
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]
            );

            DB::table('work_schedules')->updateOrInsert(
                ['department_id' => $dept['id']],
                [
                    'name'                          => $dept['name'] . ' Schedule',
                    'work_start_time'               => $dept['work_start_time'],
                    'work_end_time'                 => $dept['work_end_time'],
                    'break_start_time'              => '12:00:00',
                    'break_end_time'                => '13:00:00',
                    'grace_period_enabled'          => true,
                    'grace_period_minutes'          => 15,
                    'undertime_allowance_minutes'   => 5,
                    'undertime_enabled'             => true,
                    'monthly_late_allowance_minutes'=> 0,
                    'is_working_day'                => true,
                    'half_day_hours'                => 4,
                    'created_at'                    => now(),
                    'updated_at'                    => now(),
                ]
            );
        }
    }
}
