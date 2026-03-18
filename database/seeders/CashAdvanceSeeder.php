<?php

namespace Database\Seeders;

use App\Models\CashAdvance;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Seeder;

class CashAdvanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get some employees to seed cash advances for
        $employees = Employee::limit(5)->get();
        $admin = User::first();

        if ($employees->isEmpty() || !$admin) {
            return;
        }

        $statuses = ['Active', 'Deducted', 'Completed'];
        $reasons = [
            'Emergency medical expenses',
            'Family emergency',
            'Home repair',
            'Educational expenses',
            'Transportation needs',
            'Personal loan',
            'Advance for upcoming expenses',
        ];

        foreach ($employees as $employee) {
            // Create 2-3 cash advances per employee with different statuses
            for ($i = 0; $i < rand(2, 3); $i++) {
                $amount = rand(5000, 20000);
                $status = $statuses[array_rand($statuses)];
                $reason = $reasons[array_rand($reasons)];

                $cashAdvance = CashAdvance::create([
                    'employee_id' => $employee->id,
                    'amount' => $amount,
                    'reason' => $reason,
                    'status' => $status,
                    'created_by' => $admin->id,
                    'created_at' => now()->subDays(rand(1, 30)),
                    'updated_at' => now()->subDays(rand(0, 30)),
                ]);

                // If status is Deducted or Completed, set deducted_at
                if ($status !== 'Active') {
                    $cashAdvance->update([
                        'deducted_at' => now()->subDays(rand(0, 20)),
                    ]);
                }
            }
        }
    }
}
