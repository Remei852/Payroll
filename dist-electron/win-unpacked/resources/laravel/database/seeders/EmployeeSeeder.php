<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Employee;
use App\Models\WorkSchedule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        $employees = [
            ['employee_code' => 'SHOP2025-22', 'department' => 'Shop',         'full_name' => 'Magdale, Jay-ar B.'],
            ['employee_code' => 'SHOP2025-18', 'department' => 'Shop',         'full_name' => 'Mariquit, Consorcio jr.'],
            ['employee_code' => 'SHOP2025-08', 'department' => 'Shop',         'full_name' => 'Manlupig, Darius Sagrado'],
            ['employee_code' => 'SHOP2025-20', 'department' => 'Shop',         'full_name' => 'Tekong, Ronnie C.'],
            ['employee_code' => 'SHOP2025-24', 'department' => 'Shop',         'full_name' => 'Bangcong, Ulysses'],
            ['employee_code' => 'SHOP2025-23', 'department' => 'Shop',         'full_name' => 'ABONG, MELVIN TUONG'],
            ['employee_code' => 'ECO2025-05',  'department' => 'Ecotrade',     'full_name' => 'Fama, Ryan Luo Tubio'],
            ['employee_code' => 'ECO2025-21',  'department' => 'Ecotrade',     'full_name' => 'Ligutom, Judeirick'],
            ['employee_code' => 'JC2025-02',   'department' => 'Ecotrade',     'full_name' => 'CONCERMAN, Daryl Terec'],
            ['employee_code' => 'JC2025-06',   'department' => 'Ecotrade',     'full_name' => 'Reysoma, Marijane Mariquit'],
            ['employee_code' => 'JC2025-01',   'department' => 'Ecotrade',     'full_name' => 'Caballero, Julie Anne Dela Pena'],
            ['employee_code' => 'ECO2025-04',  'department' => 'Ecotrade',     'full_name' => 'Minoza, Regie Galgao'],
            ['employee_code' => 'ECO2025-26',  'department' => 'Ecotrade',     'full_name' => 'BANO, ANTHONY MEGRENIO'],
            ['employee_code' => 'JCT2025-12',  'department' => 'CT Print Stop',          'full_name' => 'TACAISAN, RONALYN ANGKI'],
            ['employee_code' => 'JCT2025-19',  'department' => 'Ecotrade',          'full_name' => 'Vequizo, Loui Givney Y.'],
            ['employee_code' => 'JC2025-09',   'department' => 'JCT',          'full_name' => 'Abella, Medel Omandam'],
            ['employee_code' => 'JCT2025-07',  'department' => 'JCT',          'full_name' => 'Patua, Lovely Romitares'],
            ['employee_code' => 'CT2025-13',   'department' => 'CT Print Stop','full_name' => 'Mariquit, Roselyn Jorgil'],
            ['employee_code' => 'CT2025-10',   'department' => 'CT Print Stop','full_name' => 'Micabalo, Reggie Ann Moana'],
            ['employee_code' => 'CT2025-11',   'department' => 'CT Print Stop','full_name' => 'Abong, Mylin Partulan'],
            ['employee_code' => 'JC2025-16',   'department' => 'CT Print Stop','full_name' => 'LEURAG, ALORNA MANANGKI'],
            ['employee_code' => 'JCT2025-14',  'department' => 'Shop / Eco',   'full_name' => 'Macalaguing, John lee Quinanahan'],
        ];

        // Department → work schedule times
        $scheduleConfig = [
            'Shop'         => ['start' => '08:00:00', 'end' => '17:00:00'],
            'Ecotrade'     => ['start' => '08:30:00', 'end' => '17:30:00'],
            'JCT'          => ['start' => '09:00:00', 'end' => '18:00:00'],
            'CT Print Stop'=> ['start' => '08:30:00', 'end' => '17:30:00'],
            'Shop / Eco'   => ['start' => '08:30:00', 'end' => '17:30:00'],
        ];

        // ── Create departments + work schedules via Eloquent ──────────────────
        // Using Eloquent (not DB::table) so PostgreSQL sequences are advanced
        // automatically and no manual setval() is needed.
        $departmentIds = [];
        $uniqueDepts = array_unique(array_column($employees, 'department'));

        foreach ($uniqueDepts as $deptName) {
            // firstOrCreate uses the sequence correctly on all DB drivers
            $dept = Department::withTrashed()->firstOrCreate(
                ['name' => $deptName],
                [
                    'payroll_frequency' => 'SEMI_MONTHLY',
                    'is_active'         => true,
                ]
            );

            // Restore if soft-deleted
            if ($dept->trashed()) {
                $dept->restore();
            }

            $departmentIds[$deptName] = $dept->id;

            // Create work schedule if it doesn't exist yet
            $times = $scheduleConfig[$deptName] ?? ['start' => '08:00:00', 'end' => '17:00:00'];

            WorkSchedule::firstOrCreate(
                ['department_id' => $dept->id],
                [
                    'name'                           => $deptName . ' Schedule',
                    'work_start_time'                => $times['start'],
                    'work_end_time'                  => $times['end'],
                    'break_start_time'               => '12:00:00',
                    'break_end_time'                 => '13:00:00',
                    'grace_period_minutes'           => 15,
                    'grace_period_enabled'           => true,
                    'undertime_allowance_minutes'    => 5,
                    'undertime_enabled'              => true,
                    'monthly_late_allowance_minutes' => 0,
                    'is_working_day'                 => true,
                    'half_day_hours'                 => 4,
                ]
            );
        }

        // ── Create employees ──────────────────────────────────────────────────
        foreach ($employees as $empData) {
            $nameParts = $this->parseFullName($empData['full_name']);

            Employee::updateOrCreate(
                ['employee_code' => $empData['employee_code']],
                [
                    'first_name'        => $nameParts['first_name'],
                    'last_name'         => $nameParts['last_name'],
                    'department_id'     => $departmentIds[$empData['department']],
                    'position'          => null,
                    'daily_rate'        => 350.00,
                    'hire_date'         => null,
                    'employment_status' => 'ACTIVE',
                ]
            );
        }

        $this->command->info('Seeded ' . count($employees) . ' employees across ' . count($uniqueDepts) . ' departments.');
    }

    private function parseFullName(string $fullName): array
    {
        $fullName = trim($fullName, '"\'');

        if (str_contains($fullName, ',')) {
            [$lastName, $rest] = explode(',', $fullName, 2);
            $firstName = trim(explode(' ', trim($rest), 2)[0]);
            $lastName  = trim($lastName);
        } else {
            $parts     = explode(' ', $fullName, 2);
            $firstName = trim($parts[0] ?? '');
            $lastName  = trim($parts[1] ?? '');
        }

        return [
            'first_name' => $firstName ?: 'Unknown',
            'last_name'  => $lastName  ?: 'Unknown',
        ];
    }
}
