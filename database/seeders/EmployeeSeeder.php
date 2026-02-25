<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Employee;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EmployeeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $employees = [
            ['employee_code' => 'SHOP2025-22', 'department' => 'Shop', 'full_name' => 'Magdale, Jay-ar B.'],
            ['employee_code' => 'SHOP2025-18', 'department' => 'Shop', 'full_name' => 'Mariquit, "Consorcio jr."'],
            ['employee_code' => 'SHOP2025-08', 'department' => 'Shop', 'full_name' => 'Manlupig, Darius Sagrado'],
            ['employee_code' => 'ECO2025-05', 'department' => 'Ecotrade', 'full_name' => 'Fama, Ryan Luo Tubio'],
            ['employee_code' => 'ECO2025-21', 'department' => 'Ecotrade', 'full_name' => 'Ligutom, Judeirick'],
            ['employee_code' => 'JC2025-02', 'department' => 'Ecotrade', 'full_name' => 'CONCERMAN, Daryl Terec'],
            ['employee_code' => 'SHOP2025-20', 'department' => 'Shop', 'full_name' => 'Tekong, Ronnie C.'],
            ['employee_code' => 'SHOP2025-24', 'department' => 'Shop', 'full_name' => 'Bangcong, Ulysses'],
            ['employee_code' => 'JC2025-06', 'department' => 'Ecotrade', 'full_name' => 'Reysoma, Marijane Mariquit'],
            ['employee_code' => 'JCT2025-12', 'department' => 'JCT', 'full_name' => 'TACAISAN, RONALYN ANGKI'],
            ['employee_code' => 'JCT2025-19', 'department' => 'JCT', 'full_name' => 'Vequizo, Loui Givney Y.'],
            ['employee_code' => 'CT2025-13', 'department' => 'CT Print Stop', 'full_name' => 'Mariquit, Roselyn Jorgil'],
            ['employee_code' => 'JCT2025-14', 'department' => 'Shop / Eco', 'full_name' => 'Macalaguing, John lee Quinanahan'],
            ['employee_code' => 'JC2025-01', 'department' => 'Ecotrade', 'full_name' => 'Caballero, Julie Anne Dela Peña'],
            ['employee_code' => 'CT2025-10', 'department' => 'CT Print Stop', 'full_name' => 'Micabalo, Reggie Ann Moaña'],
            ['employee_code' => 'CT2025-11', 'department' => 'CT Print Stop', 'full_name' => 'Abong, Mylin Partulan'],
            ['employee_code' => 'ECO2025-04', 'department' => 'Ecotrade', 'full_name' => 'Miñoza, Regie Galgao'],
            ['employee_code' => 'JC2025-09', 'department' => 'JCT', 'full_name' => 'Abella, Medel Omandam'],
            ['employee_code' => 'SHOP2025-23', 'department' => 'Shop', 'full_name' => 'ABONG, MELVIN TUONG'],
            ['employee_code' => 'ECO2025-26', 'department' => 'Ecotrade', 'full_name' => 'BANO, ANTHONY MEGRENIO'],
            ['employee_code' => 'JCT2025-07', 'department' => 'JCT', 'full_name' => 'Patua, Lovely Romitares'],
            ['employee_code' => 'JC2025-16', 'department' => 'CT Print Stop', 'full_name' => 'LEURAG, ALORNA MANANGKI'],
        ];

        // Create or get departments with work schedules
        $departments = [];
        $uniqueDepartments = array_unique(array_column($employees, 'department'));

        // Define work schedule times for each department
        $departmentSchedules = [
            'Shop' => ['start' => '08:00:00', 'end' => '17:00:00'],
            'Ecotrade' => ['start' => '08:30:00', 'end' => '17:30:00'],
            'JCT' => ['start' => '09:00:00', 'end' => '18:00:00'],
            'CT Print Stop' => ['start' => '08:30:00', 'end' => '17:30:00'],
            'Shop / Eco' => ['start' => '08:30:00', 'end' => '17:30:00'],
        ];

        foreach ($uniqueDepartments as $deptName) {
            // Use DB facade to avoid soft deletes scope issues
            $department = DB::table('departments')
                ->where('name', $deptName)
                ->first();

            if (!$department) {
                $id = DB::table('departments')->insertGetId([
                    'name' => $deptName,
                    'payroll_frequency' => 'SEMI_MONTHLY', // Default, can be updated later
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $departments[$deptName] = $id;

                // Create work schedule for this department
                $schedule = $departmentSchedules[$deptName] ?? ['start' => '08:00:00', 'end' => '17:00:00'];
                DB::table('work_schedules')->insert([
                    'department_id' => $id,
                    'name' => $deptName . ' Schedule', // Auto-generate name from department
                    'work_start_time' => $schedule['start'],
                    'work_end_time' => $schedule['end'],
                    'break_start_time' => '12:00:00',
                    'break_end_time' => '13:00:00',
                    'grace_period_minutes' => 15,
                    'is_working_day' => true,
                    'half_day_hours' => 4,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $departments[$deptName] = $department->id;
            }
        }

        // Create employees
        foreach ($employees as $empData) {
            // Parse full_name: "Last, First Middle" format
            $nameParts = $this->parseFullName($empData['full_name']);

            Employee::updateOrCreate(
                ['employee_code' => $empData['employee_code']],
                [
                    'first_name' => $nameParts['first_name'],
                    'last_name' => $nameParts['last_name'],
                    'department_id' => $departments[$empData['department']],
                    'position' => null, // Can be updated later
                    'daily_rate' => 0, // Default, can be updated later
                    'hire_date' => null, // Can be updated later
                    'employment_status' => 'ACTIVE',
                ]
            );
        }

        $this->command->info('Successfully seeded ' . count($employees) . ' employees.');
    }

    /**
     * Parse full name from "Last, First Middle" format
     */
    private function parseFullName(string $fullName): array
    {
        // Remove quotes and clean up
        $fullName = trim($fullName, '"');
        $fullName = trim($fullName);

        // Check if it's in "Last, First" format
        if (strpos($fullName, ',') !== false) {
            $parts = explode(',', $fullName, 2);
            $lastName = trim($parts[0]);
            $firstAndMiddle = trim($parts[1] ?? '');

            // Split first name and middle name/initial
            $firstParts = explode(' ', $firstAndMiddle, 2);
            $firstName = trim($firstParts[0] ?? '');
        } else {
            // If no comma, assume "First Last" format
            $nameParts = explode(' ', $fullName, 2);
            $firstName = trim($nameParts[0] ?? '');
            $lastName = trim($nameParts[1] ?? '');
        }

        return [
            'first_name' => $firstName ?: 'Unknown',
            'last_name' => $lastName ?: 'Unknown',
        ];
    }
}
